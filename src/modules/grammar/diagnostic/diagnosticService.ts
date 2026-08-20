import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { resolveGrammarAnswer } from '@/modules/grammar/grading/resolveGrammarAnswer'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarDrillRecord,
  GrammarFamily,
  GrammarL1Risk,
} from '@/modules/grammar/types'

import {
  seedFromDiagnostic,
  summariseDiagnostic,
  type DiagnosticOutcome,
  type DiagnosticSummary,
} from './scoreDiagnostic'
import {
  selectDiagnosticItems,
  type DiagnosticItem,
} from './selectDiagnosticItems'

/**
 * Build a placement diagnostic for this learner.
 *
 * Two queries: the points, and the learner's existing items so already-started
 * points can be skipped. Selection and weighting happen in the pure selector.
 */
export async function buildGrammarDiagnostic({
  actorId,
  limit,
}: {
  actorId: string
  limit: number
}): Promise<DiagnosticItem[]> {
  const [points, items] = await Promise.all([
    GrammarPointModel.find({ drills: { $ne: [] }, mergedInto: null })
      .select('slug title cefrLevel complexity family l1Risk drills')
      .lean(),
    actorId
      ? UserGrammarItemModel.find({ actorId }).select('pointSlug').lean()
      : [],
  ])

  return selectDiagnosticItems({
    candidates: points.map(point => ({
      cefrLevel: point.cefrLevel as GrammarCefrLevel,
      complexity: point.complexity as GrammarComplexity,
      drills: point.drills as GrammarDrillRecord[],
      family: point.family as GrammarFamily,
      l1Risk: point.l1Risk as GrammarL1Risk,
      slug: point.slug,
      title: point.title,
    })),
    limit,
    skipSlugs: new Set(items.map(item => item.pointSlug)),
  })
}

export interface DiagnosticSubmission {
  answer: string
  drillId: string
  pointSlug: string
}

export interface DiagnosticResult extends DiagnosticSummary {
  seededCount: number
}

/**
 * Grade a whole diagnostic and seed the ladder from it.
 *
 * The client sends only what was typed or chosen. Every answer is graded here
 * against the stored drill, exactly as the normal recall route does - a
 * diagnostic that could be self-reported would poison the ladder it seeds.
 *
 * Idempotent per session: each answer is logged with a key derived from the
 * caller's `sessionKey`, and the unique (actorId, idempotencyKey) index means a
 * resubmitted or retried session cannot double-seed. Answers whose attempt
 * already exists are skipped rather than re-applied.
 */
export async function submitGrammarDiagnostic({
  actorId,
  answers,
  now = new Date(),
  sessionKey,
}: {
  actorId: string
  answers: DiagnosticSubmission[]
  now?: Date
  sessionKey: string
}): Promise<DiagnosticResult> {
  const slugs = [...new Set(answers.map(answer => answer.pointSlug))]
  const points = await GrammarPointModel.find({
    mergedInto: null,
    slug: { $in: slugs },
  })
    .select('slug cefrLevel l1Risk drills')
    .lean()
  const pointBySlug = new Map(points.map(point => [point.slug, point]))

  const outcomes: DiagnosticOutcome[] = []
  let seededCount = 0

  for (const submitted of answers) {
    const point = pointBySlug.get(submitted.pointSlug)

    if (!point) continue

    const drill = (point.drills as GrammarDrillRecord[]).find(
      candidate => candidate.id === submitted.drillId
    )

    if (!drill) continue

    const grade = resolveGrammarAnswer({ answer: submitted.answer, drill })
    const outcome: DiagnosticOutcome = {
      cefrLevel: point.cefrLevel as GrammarCefrLevel,
      isCorrect: grade.isCorrect,
      l1Risk: point.l1Risk as GrammarL1Risk,
      pointSlug: point.slug,
    }

    outcomes.push(outcome)

    const idempotencyKey = `${sessionKey}:${point.slug}:${drill.id}`
    const existing = await GrammarDrillAttemptModel.findOne({
      actorId,
      idempotencyKey,
    })
      .select('_id')
      .lean()

    // Already applied on an earlier submit of this session.
    if (existing) continue

    const seed = seedFromDiagnostic({ now, outcome })

    try {
      await GrammarDrillAttemptModel.create({
        actorId,
        at: now,
        drillId: drill.id,
        idempotencyKey,
        kind: drill.kind,
        matchedAnswer: grade.matchedAnswer,
        pointSlug: point.slug,
        score: grade.score,
        stageAfter: seed.recallStage,
        stageBefore: 1,
        userAnswer: submitted.answer.slice(0, 4000),
        verdict: grade.verdict,
      })
    } catch {
      // Lost a race with a concurrent submit of the same session; the winner
      // already seeded this point.
      continue
    }

    await UserGrammarItemModel.updateOne(
      { actorId, pointSlug: point.slug },
      {
        $set: {
          correctCount: grade.isCorrect ? 1 : 0,
          dueAt: seed.dueAt,
          lastReviewedAt: now,
          masteredAt: null,
          masteredReason: null,
          recallStage: seed.recallStage,
          reviewCount: 1,
          status: 'learning',
          wrongCount: grade.isCorrect ? 0 : 1,
        },
      },
      { upsert: true }
    )

    seededCount += 1
  }

  return { ...summariseDiagnostic(outcomes), seededCount }
}

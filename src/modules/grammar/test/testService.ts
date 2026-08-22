import 'server-only'

import { randomUUID } from 'crypto'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { GrammarTestSessionModel } from '@/models/grammar/GrammarTestSessionModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'

import {
  GRAMMAR_MAX_GENERATED_DRILLS,
  GRAMMAR_TEST_COOLDOWN_MS,
  GRAMMAR_TEST_DAILY_LIMIT,
} from '../constants'
import { selectDrillForStage } from '../recall/selectDrillForStage'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarDrillRecord,
  GrammarFamily,
  GrammarL1Risk,
  GrammarReviewStatus,
  GrammarUserItemStatus,
} from '../types'

import { generateTestDrills } from './generateTestDrills'
import { gradeTestSession } from './gradeTestSession'
import { selectTestPoints } from './selectTestPoints'
import type {
  GrammarTestCandidate,
  GrammarTestConfig,
  GrammarTestQuestionApiRecord,
  GrammarTestQuestionRecord,
  GrammarTestReportRecord,
  GrammarTestStartResult,
} from './types'

export class GrammarTestRateLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GrammarTestRateLimitError'
  }
}

export class GrammarTestEmptyScopeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GrammarTestEmptyScopeError'
  }
}

function startOfToday(now: Date) {
  const start = new Date(now)

  start.setHours(0, 0, 0, 0)

  return start
}

/**
 * Cost guard on a route that calls a paid API.
 *
 * Two checks with different jobs. The cooldown catches the accident - a
 * double-clicked Start, a retry loop - and is why the caller gets the session it
 * already has instead of a second one. The daily cap catches the runaway: a
 * stuck client that submits between starts would sail past the cooldown
 * forever.
 */
async function assertWithinLimits({
  actorId,
  now,
}: {
  actorId: string
  now: Date
}) {
  const recent = await GrammarTestSessionModel.findOne({
    actorId,
    createdAt: { $gte: new Date(now.getTime() - GRAMMAR_TEST_COOLDOWN_MS) },
    status: 'open',
  })
    .sort({ createdAt: -1 })
    .lean()

  if (recent)
    throw new GrammarTestRateLimitError(
      'You already have a test open. Finish it, or wait a moment before starting another.'
    )

  const todayCount = await GrammarTestSessionModel.countDocuments({
    actorId,
    createdAt: { $gte: startOfToday(now) },
  })

  if (todayCount >= GRAMMAR_TEST_DAILY_LIMIT)
    throw new GrammarTestRateLimitError(
      `That is ${GRAMMAR_TEST_DAILY_LIMIT} tests today. Come back tomorrow - the daily queue is the part that actually sticks.`
    )
}

/**
 * Load every point a test could draw from, plus the learner's state for it.
 *
 * TWO queries regardless of taxonomy size, the same rule `dueQueueService.ts`
 * follows and for the same reason: the obvious implementation fetches points
 * then loops fetching each learner item, so the screen gets slower exactly as
 * the learner makes progress.
 */
async function loadCandidates({
  actorId,
  now,
}: {
  actorId: string
  now: Date
}): Promise<{ candidates: GrammarTestCandidate[]; dueSlugs: Set<string> }> {
  const [points, items] = await Promise.all([
    GrammarPointModel.find({ drills: { $ne: [] }, mergedInto: null })
      .select(
        'slug title summary cefrLevel complexity family l1Risk l1RiskObserved reviewStatus drills formPatterns commonMistakes'
      )
      .lean(),
    UserGrammarItemModel.find({ actorId })
      .select('pointSlug status recallStage dueAt')
      .lean(),
  ])
  const itemBySlug = new Map(items.map(item => [item.pointSlug, item]))
  const dueSlugs = new Set(
    items
      .filter(
        item => item.status === 'learning' && item.dueAt && item.dueAt <= now
      )
      .map(item => item.pointSlug)
  )

  return {
    candidates: points.map(point => ({
      cefrLevel: point.cefrLevel as GrammarCefrLevel,
      commonMistakes: (point.commonMistakes ??
        []) as GrammarTestCandidate['commonMistakes'],
      complexity: point.complexity as GrammarComplexity,
      drills: point.drills as GrammarDrillRecord[],
      family: point.family as GrammarFamily,
      formPatterns: (point.formPatterns ?? []) as string[],
      l1Risk: point.l1Risk as GrammarL1Risk,
      l1RiskObserved: (point.l1RiskObserved ?? null) as GrammarL1Risk | null,
      reviewStatus: point.reviewStatus as GrammarReviewStatus,
      slug: point.slug,
      status:
        (itemBySlug.get(point.slug)?.status as GrammarUserItemStatus) ?? null,
      summary: point.summary,
      title: point.title,
    })),
    dueSlugs,
  }
}

function stageFor(
  slug: string,
  items: Map<string, { recallStage?: number | null }>
) {
  // 0 means "no ladder row", which is a real state the attempt schema accepts.
  return items.get(slug)?.recallStage ?? 0
}

/**
 * Build a test and store it.
 *
 * ```
 *   config -> loadCandidates -> selectTestPoints -> generateTestDrills
 *                                     |                    |
 *                                     |            (chunked, may partially fail)
 *                                     v                    v
 *                            stored-drill backfill for every point
 *                            that has no generated question
 *                                     |
 *                                     v
 *                          GrammarTestSession (answers inside)
 *                                     |
 *                     +---------------+---------------+
 *                     v                               v
 *          append generated drills          serve stripped questions
 *          (capped, FIFO, marked)
 * ```
 *
 * A test NEVER fails because generation failed. Every point that did not get a
 * generated question falls back to its stored pool, and if a point has neither,
 * it is dropped and the shortfall is named in the notice. Silent truncation
 * would read as a bug; a named shortfall reads as a fact.
 */
export async function startGrammarTest({
  actorId,
  config,
  fetcher,
  now = new Date(),
}: {
  actorId: string
  config: GrammarTestConfig
  fetcher?: typeof fetch
  now?: Date
}): Promise<GrammarTestStartResult> {
  await assertWithinLimits({ actorId, now })

  const { candidates, dueSlugs } = await loadCandidates({ actorId, now })
  const selection = selectTestPoints({ candidates, config, dueSlugs })

  if (selection.points.length === 0)
    throw new GrammarTestEmptyScopeError(
      'No grammar points match those filters. Widen the range, or pick a different scope.'
    )

  const items = await UserGrammarItemModel.find({
    actorId,
    pointSlug: { $in: selection.points.map(point => point.slug) },
  })
    .select('pointSlug recallStage')
    .lean()
  const stageBySlug = new Map(items.map(item => [item.pointSlug, item]))

  const generation = await generateTestDrills({
    fetcher,
    points: selection.points,
  })
  const generatedBySlug = new Map(
    generation.questions.map(question => [question.pointSlug, question])
  )

  const questions: GrammarTestQuestionRecord[] = []
  const appendBySlug = new Map<string, GrammarDrillRecord>()
  let droppedForNoDrills = 0

  for (const point of selection.points) {
    const stageBefore = stageFor(point.slug, stageBySlug)
    const generated = generatedBySlug.get(point.slug)

    if (generated) {
      const drillId = `gen-${randomUUID().slice(0, 12)}`

      questions.push({
        acceptedAnswers: generated.acceptedAnswers,
        choices: generated.choices,
        drillId,
        explanation: generated.explanation,
        generated: true,
        id: randomUUID(),
        kind: generated.kind,
        pointSlug: point.slug,
        pointTitle: point.title,
        prompt: generated.prompt,
        punctuationSensitive: generated.punctuationSensitive,
        stageBefore,
        target: generated.target,
      })
      appendBySlug.set(point.slug, {
        acceptedAnswers: generated.acceptedAnswers,
        choices: generated.choices,
        difficulty: generated.difficulty,
        explanation: generated.explanation,
        generated: true,
        id: drillId,
        kind: generated.kind,
        prompt: generated.prompt,
        punctuationSensitive: generated.punctuationSensitive,
        target: generated.target,
      })
      continue
    }

    // Backfill. `selectDrillForStage` already excludes generated drills, so
    // this only ever reaches reviewed content.
    const stored = selectDrillForStage({
      drills: point.drills,
      pointSlug: point.slug,
      stage: Math.max(1, stageBefore),
    })

    if (!stored) {
      droppedForNoDrills += 1
      continue
    }

    questions.push({
      acceptedAnswers: stored.acceptedAnswers,
      choices: stored.choices,
      drillId: stored.id,
      explanation: stored.explanation,
      generated: false,
      id: randomUUID(),
      kind: stored.kind,
      pointSlug: point.slug,
      pointTitle: point.title,
      prompt: stored.prompt,
      punctuationSensitive: stored.punctuationSensitive === true,
      stageBefore,
      target: stored.target,
    })
  }

  if (questions.length === 0)
    throw new GrammarTestEmptyScopeError(
      'None of the matching grammar points have drills written yet. Run grammar:generate, or widen the range.'
    )

  const notices = [...generation.notices]

  if (selection.shortfall > 0)
    notices.push(
      `Only ${selection.points.length} of the ${config.questionCount} points you asked for matched those filters.`
    )
  if (droppedForNoDrills > 0)
    notices.push(
      `${droppedForNoDrills} matching point${droppedForNoDrills === 1 ? '' : 's'} had no usable drill and ${droppedForNoDrills === 1 ? 'was' : 'were'} skipped.`
    )

  const notice = notices.length > 0 ? notices.join(' ') : null
  const session = await GrammarTestSessionModel.create({
    actorId,
    config,
    notice,
    questions,
    status: 'open',
  })

  await appendGeneratedDrills(appendBySlug)

  return {
    notice,
    questions: questions.map(question => {
      const point = selection.points.find(
        candidate => candidate.slug === question.pointSlug
      )

      return {
        cefrLevel: point?.cefrLevel ?? 'A1',
        choices: question.choices,
        generated: question.generated,
        id: question.id,
        kind: question.kind,
        l1Risk: point?.l1Risk ?? 'medium',
        pointSlug: question.pointSlug,
        pointTitle: question.pointTitle,
        prompt: question.prompt,
        reviewStatus: point?.reviewStatus ?? 'unverified',
      } satisfies GrammarTestQuestionApiRecord
    }),
    sessionId: String(session._id),
  }
}

/**
 * Add generated drills to their points, capped.
 *
 * The cap is why this is a read-modify-write per point rather than a `$push`
 * with `$slice`: eviction has to keep the REVIEWED drills and drop only the
 * oldest generated ones, and `$slice` cannot express that. Points are few per
 * test (at most 40) and a failure here must never fail the test, so the whole
 * thing is best-effort.
 */
async function appendGeneratedDrills(
  appendBySlug: Map<string, GrammarDrillRecord>
) {
  if (appendBySlug.size === 0) return

  await Promise.all(
    [...appendBySlug.entries()].map(async ([slug, drill]) => {
      try {
        const point = await GrammarPointModel.findOne({ slug })
          .select('drills')
          .lean()

        if (!point) return

        const existing = point.drills as GrammarDrillRecord[]
        const reviewed = existing.filter(entry => !entry.generated)
        const generated = [
          ...existing.filter(entry => entry.generated),
          drill,
        ].slice(-GRAMMAR_MAX_GENERATED_DRILLS)

        await GrammarPointModel.updateOne(
          { slug },
          { $set: { drills: [...reviewed, ...generated] } }
        )
      } catch {
        // A drill that fails to persist is a drill the learner still answered.
        // The session document is the source of truth for grading, so losing
        // the append costs future reuse and nothing else.
      }
    })
  )
}

/**
 * Grade a submitted test and apply the ladder.
 *
 * The FIRST thing this does is claim the session:
 *
 * ```
 *   findOneAndUpdate({_id, actorId, status: 'open'} -> status: 'submitted')
 *          |                                   |
 *      claimed                             not claimed
 *          |                                   |
 *   grade + write ladder              replay the stored report
 * ```
 *
 * A conditional update, not a read-then-write. Two submits 200ms apart both see
 * `'open'` under a plain read, and both then reset the same points to stage 1
 * and write duplicate attempt rows. Making the status change the same operation
 * as the check means exactly one caller can ever proceed - the same principle
 * `GrammarDrillAttemptModel.ts:129` states about letting the database be the
 * guarantee rather than hoping the UI prevents a second click.
 *
 * Per-question idempotency keys are DERIVED (`${sessionId}:${questionId}`)
 * rather than minted, reusing the retired diagnostic's pattern, so the unique
 * `(actorId, idempotencyKey)` index remains the real backstop even if the claim
 * were somehow bypassed.
 */
export async function submitGrammarTest({
  actorId,
  answers,
  now = new Date(),
  sessionId,
}: {
  actorId: string
  answers: { answer: string; questionId: string }[]
  now?: Date
  sessionId: string
}): Promise<GrammarTestReportRecord | null> {
  const claimed = await GrammarTestSessionModel.findOneAndUpdate(
    { _id: sessionId, actorId, status: 'open' },
    { $set: { status: 'submitted', submittedAt: now } },
    { new: true }
  ).lean()

  if (!claimed) {
    // Either already submitted (replay it) or not this learner's session.
    const existing = await GrammarTestSessionModel.findOne({
      _id: sessionId,
      actorId,
    }).lean()

    if (!existing?.report) return null

    return existing.report as GrammarTestReportRecord
  }

  const questions = claimed.questions as GrammarTestQuestionRecord[]
  const slugs = [...new Set(questions.map(question => question.pointSlug))]
  const items = await UserGrammarItemModel.find({
    actorId,
    pointSlug: { $in: slugs },
  })
    .select('pointSlug status')
    .lean()
  const statusBySlug = new Map<string, GrammarUserItemStatus | null>(
    items.map(item => [item.pointSlug, item.status as GrammarUserItemStatus])
  )

  const graded = gradeTestSession({ answers, questions, statusBySlug })

  for (const entry of graded.graded) {
    const question = questions.find(
      candidate => candidate.id === entry.outcome.questionId
    )

    if (!question) continue

    try {
      await GrammarDrillAttemptModel.create({
        actorId,
        at: now,
        drillId: question.drillId,
        idempotencyKey: `${sessionId}:${question.id}`,
        kind: question.kind,
        matchedAnswer: entry.outcome.matchedAnswer,
        origin: 'test',
        pointSlug: question.pointSlug,
        score: entry.verdict === 'correct' ? 0 : null,
        stageAfter: entry.stageAfter,
        stageBefore: entry.stageBefore,
        userAnswer: entry.outcome.userAnswer.slice(0, 4000),
        verdict: entry.verdict,
      })
    } catch {
      // Duplicate key: a concurrent submit that lost the claim race already
      // wrote this row. Its ladder write landed too, so skipping is correct.
      continue
    }

    if (!entry.effect) continue

    await UserGrammarItemModel.updateOne(
      { actorId, pointSlug: entry.effect.pointSlug },
      {
        $set: {
          dueAt: now,
          lastReviewedAt: now,
          masteredAt: null,
          masteredReason: null,
          recallStage: entry.effect.recallStage,
          status: entry.effect.status,
        },
        $inc: { reviewCount: 1, wrongCount: 1 },
      },
      { setDefaultsOnInsert: true, upsert: true }
    )
  }

  const report: GrammarTestReportRecord = {
    correct: graded.correct,
    knockedBack: graded.knockedBack,
    notice: claimed.notice ?? null,
    outcomes: graded.graded.map(entry => entry.outcome),
    total: graded.total,
  }

  await GrammarTestSessionModel.updateOne(
    { _id: sessionId },
    {
      $set: {
        report,
        score: { correct: graded.correct, total: graded.total },
      },
    }
  )

  return report
}

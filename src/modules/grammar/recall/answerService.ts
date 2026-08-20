import 'server-only'

import { GrammarDrillAttemptModel } from '@/models/grammar/GrammarDrillAttemptModel'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { UserGrammarItemModel } from '@/models/grammar/UserGrammarItemModel'
import { resolveGrammarAnswer } from '@/modules/grammar/grading/resolveGrammarAnswer'
import { toUserGrammarItemRecord } from '@/modules/grammar/services/userGrammarItemService'
import type {
  GrammarDrillRecord,
  GrammarRecallAnswerResult,
} from '@/modules/grammar/types'
import {
  applyRecallAnswer,
  getInitialRecallState,
  type RecallDifficulty,
} from '@/modules/learning/recall/recallLadder'

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}

/**
 * Resolve a point slug through any `mergedInto` redirect. Published slugs are
 * immutable, so a learner item recorded against a retired slug still lands on
 * the surviving point instead of silently disappearing from the queue.
 */
async function resolveLivePoint(pointSlug: string) {
  const found = await GrammarPointModel.findOne({ slug: pointSlug })
    .select('slug title l1Risk drills mergedInto')
    .lean()

  if (!found) return null
  if (!found.mergedInto) return found

  return GrammarPointModel.findOne({ slug: found.mergedInto })
    .select('slug title l1Risk drills mergedInto')
    .lean()
}

/**
 * Grade one submitted answer and advance the ladder.
 *
 * Two invariants, both load-bearing:
 *
 * 1. THE SERVER OWNS CORRECTNESS. The client sends only
 *    { pointSlug, drillId, idempotencyKey, answer }. The drill - with its target
 *    and accepted answers - is re-read from Mongo here. If the client could
 *    influence the verdict, any client bug or stale page would quietly corrupt
 *    the schedule and mastery would become unfalsifiable.
 *
 * 2. IT IS SAFE TO RETRY. A prior attempt on (actorId, idempotencyKey) is
 *    looked up BEFORE anything mutates, and its original result is returned if
 *    found. Otherwise a double-click or network retry applies the ladder twice,
 *    advancing two rungs for one answer and mastering a stage-6 point on a
 *    single response. The unique index is the real guarantee; this lookup just
 *    makes the happy path cheap.
 */
export async function submitGrammarAnswer({
  actorId,
  answer,
  drillId,
  idempotencyKey,
  now = new Date(),
  pointSlug,
  revealed = false,
}: {
  actorId: string
  answer: string
  drillId: string
  idempotencyKey: string
  now?: Date
  pointSlug: string
  revealed?: boolean
}): Promise<GrammarRecallAnswerResult | null> {
  const point = await resolveLivePoint(pointSlug)

  if (!point) return null

  const drill = (point.drills as GrammarDrillRecord[]).find(
    candidate => candidate.id === drillId
  )

  if (!drill) return null

  // Idempotency: replay the original outcome rather than grading again.
  const priorAttempt = await GrammarDrillAttemptModel.findOne({
    actorId,
    idempotencyKey,
  }).lean()

  if (priorAttempt) {
    const existing = await UserGrammarItemModel.findOne({
      actorId,
      pointSlug: point.slug,
    }).lean()

    if (!existing) return null

    return {
      correction: null,
      explanation: drill.explanation,
      isCorrect: priorAttempt.verdict === 'correct',
      item: toUserGrammarItemRecord(existing),
      matchedAnswer: priorAttempt.matchedAnswer ?? null,
      verdict: priorAttempt.verdict as GrammarRecallAnswerResult['verdict'],
    }
  }

  const grade = resolveGrammarAnswer({ answer, drill, revealed })

  const currentItem =
    (await UserGrammarItemModel.findOne({
      actorId,
      pointSlug: point.slug,
    }).lean()) ?? null
  const counters = currentItem ?? {
    ...getInitialRecallState(now),
    pointSlug: point.slug,
  }
  const stageBefore = counters.recallStage

  const patch = applyRecallAnswer({
    difficulty: point.l1Risk as RecallDifficulty,
    isCorrect: grade.isCorrect,
    item: {
      correctCount: counters.correctCount,
      recallStage: counters.recallStage,
      reviewCount: counters.reviewCount,
      wrongCount: counters.wrongCount,
    },
    now,
  })

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
      stageAfter: patch.recallStage,
      stageBefore,
      userAnswer: answer.slice(0, 4000),
      verdict: grade.verdict,
    })
  } catch (error) {
    // Lost the race against a concurrent identical submit. The winner already
    // applied the ladder, so return its result instead of applying it twice.
    if (isDuplicateKeyError(error)) {
      const settled = await UserGrammarItemModel.findOne({
        actorId,
        pointSlug: point.slug,
      }).lean()

      return settled
        ? {
            correction: null,
            explanation: drill.explanation,
            isCorrect: grade.isCorrect,
            item: toUserGrammarItemRecord(settled),
            matchedAnswer: grade.matchedAnswer,
            verdict: grade.verdict,
          }
        : null
    }

    throw error
  }

  const updated = await UserGrammarItemModel.findOneAndUpdate(
    { actorId, pointSlug: point.slug },
    { $set: patch },
    { new: true, setDefaultsOnInsert: true, upsert: true }
  ).lean()

  if (!updated) return null

  return {
    correction: grade.correction
      ? {
          expected: grade.matchedAnswer ?? drill.target,
          tokens: grade.correction.feedbackTokens.map(token => ({
            actual: token.actualOriginal ?? token.actual,
            expected: token.expectedOriginal ?? token.expected,
            status: token.status,
          })),
        }
      : null,
    explanation: drill.explanation,
    isCorrect: grade.isCorrect,
    item: toUserGrammarItemRecord(updated),
    matchedAnswer: grade.matchedAnswer,
    verdict: grade.verdict,
  }
}

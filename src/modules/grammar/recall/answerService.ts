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

import { toRecallCorrection } from './recallTaskGrading'
import { getReplayLadderRepair } from './replayLadderRepair'

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
 * The drill an answer was for, through the point's merge redirect. Null when
 * the point or the drill is gone (deleted, or renamed by an edit).
 */
async function resolveDrill(pointSlug: string, drillId: string) {
  const point = await resolveLivePoint(pointSlug)

  if (!point) return { drill: null, point: null }

  const drill =
    (point.drills as GrammarDrillRecord[]).find(
      candidate => candidate.id === drillId
    ) ?? null

  return { drill, point }
}

interface PriorAttempt {
  at: Date
  drillId: string
  matchedAnswer?: string | null
  origin?: string | null
  pointSlug: string
  stageBefore: number
  verdict: string
}

/**
 * Answer a replay with the original outcome, and finish its ladder update if
 * the first request died between writing the attempt and moving the ladder.
 * The repair is a compare-and-set on the stage the attempt found, so two
 * replays racing each other still move the ladder once.
 */
async function replayAttempt({
  actorId,
  attempt,
}: {
  actorId: string
  attempt: PriorAttempt
}): Promise<GrammarRecallAnswerResult | null> {
  const { drill, point } = await resolveDrill(
    attempt.pointSlug,
    attempt.drillId
  )
  let itemFilter = { actorId, pointSlug: attempt.pointSlug }
  let item = await UserGrammarItemModel.findOne(itemFilter).lean()

  // The point was merged since: its ladder row may live on the survivor.
  if (!item && point && point.slug !== attempt.pointSlug) {
    itemFilter = { actorId, pointSlug: point.slug }
    item = await UserGrammarItemModel.findOne(itemFilter).lean()
  }

  const repair = getReplayLadderRepair({
    attempt,
    difficulty: (point?.l1Risk ?? 'medium') as RecallDifficulty,
    item,
  })

  if (repair)
    try {
      // No item yet means the first answer never created one: insert it.
      // Otherwise update only while the item still sits where the attempt
      // found it, so a concurrent replay that repaired it first wins.
      const repaired = await UserGrammarItemModel.findOneAndUpdate(
        item
          ? {
              ...itemFilter,
              $or: [
                { lastReviewedAt: null },
                { lastReviewedAt: { $lt: attempt.at } },
              ],
              _id: item._id,
              recallStage: attempt.stageBefore,
            }
          : itemFilter,
        { $set: repair },
        item
          ? { new: true }
          : { new: true, setDefaultsOnInsert: true, upsert: true }
      ).lean()

      item = repaired ?? (await UserGrammarItemModel.findOne(itemFilter).lean())
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error

      item = await UserGrammarItemModel.findOne(itemFilter).lean()
    }

  if (!item) return null

  return {
    correction: null,
    explanation: drill?.explanation ?? '',
    isCorrect: attempt.verdict === 'correct',
    item: toUserGrammarItemRecord(item),
    matchedAnswer: attempt.matchedAnswer ?? null,
    verdict: attempt.verdict as GrammarRecallAnswerResult['verdict'],
  }
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
 *    the schedule and mastery would become unfalsifiable. The browser does
 *    grade the same drill locally for an instant verdict (`recallTaskGrading`),
 *    but only to predict this result: what is returned here replaces it.
 *
 * 2. IT IS SAFE TO RETRY. A prior attempt on (actorId, idempotencyKey) is
 *    looked up FIRST - before the point or drill is even resolved, so a replay
 *    still reads as saved after the drill was edited or the point merged - and
 *    its original result is returned if found. Otherwise a double-click or
 *    network retry applies the ladder twice, advancing two rungs for one answer
 *    and mastering a stage-6 point on a single response. The unique index is
 *    the real guarantee; this lookup just makes the happy path cheap.
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
  // Idempotency: replay the original outcome rather than grading again.
  const priorAttempt = await GrammarDrillAttemptModel.findOne({
    actorId,
    idempotencyKey,
  }).lean()

  if (priorAttempt) return replayAttempt({ actorId, attempt: priorAttempt })

  const { drill, point } = await resolveDrill(pointSlug, drillId)

  if (!point || !drill) return null

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
  // A task from a stale queue (another tab ran the session, or the queue was
  // read while answers were still saving) carries a fresh idempotency key, so
  // the replay lookup cannot catch it. Grade it, but leave the ladder alone.
  const isDue =
    !currentItem ||
    (currentItem.status === 'learning' &&
      currentItem.dueAt != null &&
      currentItem.dueAt <= now)

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
      origin: isDue ? 'recall' : 'early',
      pointSlug: point.slug,
      score: grade.score,
      stageAfter: isDue ? patch.recallStage : stageBefore,
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

  if (!isDue)
    return {
      correction: toRecallCorrection(grade, drill.target),
      explanation: drill.explanation,
      isCorrect: grade.isCorrect,
      item: toUserGrammarItemRecord(currentItem),
      matchedAnswer: grade.matchedAnswer,
      verdict: grade.verdict,
    }

  // Compare-and-set on the stage this answer was graded against: two
  // different tasks for the same point answered at once move the ladder once.
  const updated = currentItem
    ? await UserGrammarItemModel.findOneAndUpdate(
        { _id: currentItem._id, actorId, recallStage: stageBefore },
        { $set: patch },
        { new: true }
      ).lean()
    : await UserGrammarItemModel.findOneAndUpdate(
        { actorId, pointSlug: point.slug },
        { $set: patch },
        { new: true, setDefaultsOnInsert: true, upsert: true }
      ).lean()
  const settled =
    updated ??
    (await UserGrammarItemModel.findOne({
      actorId,
      pointSlug: point.slug,
    }).lean())

  if (!settled) return null

  return {
    correction: toRecallCorrection(grade, drill.target),
    explanation: drill.explanation,
    isCorrect: grade.isCorrect,
    item: toUserGrammarItemRecord(settled),
    matchedAnswer: grade.matchedAnswer,
    verdict: grade.verdict,
  }
}

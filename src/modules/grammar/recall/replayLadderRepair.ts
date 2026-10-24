import {
  applyRecallAnswer,
  getInitialRecallState,
  type RecallCounters,
  type RecallDifficulty,
} from '@/modules/learning/recall/recallLadder'

export interface ReplayedAttempt {
  at: Date
  /** Missing on rows written before origins existed: those are recall. */
  origin?: string | null
  stageBefore: number
  verdict: string
}

export interface ReplayedItemState extends RecallCounters {
  lastReviewedAt?: Date | null
}

/**
 * The ladder update a replayed attempt still owes, or null when it already
 * landed.
 *
 * An answer writes its attempt first and moves the ladder second. A 5xx in
 * between leaves the attempt saved and the ladder untouched, and the outbox
 * retry then takes the replay branch - so without this the answer would never
 * count. The ladder is owed only while the item still sits where the attempt
 * found it: on the attempt's stageBefore, and not reviewed since the attempt
 * (an item that moved away and back to the same stage must not be moved
 * again). The patch is recomputed from the item's current counters, which are
 * the ones the attempt saw because nothing has touched the item since.
 */
export function getReplayLadderRepair({
  attempt,
  difficulty,
  item,
}: {
  attempt: ReplayedAttempt
  difficulty: RecallDifficulty
  /** The learner item now, or null if the first answer never created it. */
  item: ReplayedItemState | null
}) {
  // Test and diagnostic answers follow their own ladder rules.
  if (attempt.origin && attempt.origin !== 'recall') return null

  const counters = item ?? getInitialRecallState(attempt.at)

  if (counters.recallStage !== attempt.stageBefore) return null
  if (item?.lastReviewedAt && item.lastReviewedAt >= attempt.at) return null

  return applyRecallAnswer({
    difficulty,
    isCorrect: attempt.verdict === 'correct',
    item: {
      correctCount: counters.correctCount,
      recallStage: counters.recallStage,
      reviewCount: counters.reviewCount,
      wrongCount: counters.wrongCount,
    },
    now: attempt.at,
  })
}

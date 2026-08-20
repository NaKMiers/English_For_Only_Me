/**
 * The shared 7-stage recall ladder.
 *
 * Lives in `modules/learning` rather than inside a single subject module
 * because grammar is its first consumer and vocabulary is its second: pointing
 * vocabulary at this file is the Phase 2 exit criterion. A shared abstraction
 * with one consumer is just a private module with an aspirational directory
 * name, so the migration is a gate rather than an aspiration.
 *
 *              ┌──────── wrong answer, from ANY stage ────────┐
 *              ▼                                              │
 *  (no row) → stage 1 → stage 2 → ... → stage 7 ──correct──► mastered
 *   first     +1d       +1d            +17d                  dueAt = null
 *
 * Intervals are scaled by how hard the item is for THIS learner (see
 * `RECALL_DIFFICULTY_INTERVAL_SCALE`). `medium` scales by exactly 1, which is
 * what makes adopting this module behaviour-preserving for callers that do not
 * supply a difficulty.
 */

export const RECALL_STAGES = [1, 2, 3, 4, 5, 6, 7] as const

export type RecallStage = (typeof RECALL_STAGES)[number]

export const RECALL_MASTERY_STAGE: RecallStage = 7

/** Days to wait after a correct answer at each stage. Totals 44 days at scale 1. */
export const RECALL_STAGE_INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5 | 6, number> =
  {
    1: 1,
    2: 1,
    3: 4,
    4: 7,
    5: 14,
    6: 17,
  }

export type RecallDifficulty = 'low' | 'medium' | 'high'

/**
 * Interval multiplier by item difficulty.
 *
 * This is where the grammar module's `l1Risk` becomes load-bearing rather than
 * decorative. FSRS beats a fixed ladder by *learning* per-card difficulty from
 * review history, but a 162-point curriculum spends most of its life in the
 * cold start, where FSRS has nothing to learn from yet. `l1Risk` is a better
 * prior available on day zero: a Vietnamese speaker's article errors are
 * predictably persistent before a single review happens. So hard items come
 * back sooner and easy items come back later, from the very first answer.
 *
 * `medium` is exactly 1 so existing callers keep their current schedule.
 */
export const RECALL_DIFFICULTY_INTERVAL_SCALE: Record<
  RecallDifficulty,
  number
> = {
  high: 0.6,
  low: 1.5,
  medium: 1,
}

const DAY_MS = 86_400_000

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS)
}

export function normalizeRecallStage(
  stage: number | null | undefined
): RecallStage {
  return RECALL_STAGES.includes(stage as RecallStage)
    ? (stage as RecallStage)
    : 1
}

/**
 * Days until an item at `stage` is next due, scaled by difficulty. Never less
 * than a day: an item you just answered correctly should not reappear today.
 */
export function getRecallIntervalDays({
  difficulty = 'medium',
  stage,
}: {
  difficulty?: RecallDifficulty
  stage: RecallStage
}) {
  if (stage >= RECALL_MASTERY_STAGE) return null

  const base =
    RECALL_STAGE_INTERVAL_DAYS[stage as keyof typeof RECALL_STAGE_INTERVAL_DAYS]

  return Math.max(
    1,
    Math.round(base * RECALL_DIFFICULTY_INTERVAL_SCALE[difficulty])
  )
}

export interface RecallCounters {
  correctCount: number
  recallStage: number
  reviewCount: number
  wrongCount: number
}

export function getInitialRecallState(now = new Date()) {
  return {
    correctCount: 0,
    dueAt: now,
    knownAt: null,
    knownReason: null,
    masteredAt: null,
    masteredReason: null,
    recallStage: 1 as const,
    reviewCount: 0,
    status: 'learning' as const,
    wrongCount: 0,
  }
}

export function getAlreadyKnownState(now = new Date()) {
  return {
    dueAt: null,
    knownAt: now,
    knownReason: 'manual' as const,
    masteredAt: null,
    masteredReason: null,
    recallStage: 1 as const,
    status: 'alreadyKnow' as const,
  }
}

/**
 * Apply one graded answer and return the patch to persist.
 *
 * A wrong answer resets to stage 1 and is due immediately - the ladder is
 * unforgiving on purpose, because a half-remembered rule is the thing that
 * costs marks. A correct answer at the top stage marks mastery and stops
 * scheduling the item.
 */
export function applyRecallAnswer({
  difficulty = 'medium',
  isCorrect,
  item,
  now = new Date(),
}: {
  difficulty?: RecallDifficulty
  isCorrect: boolean
  item: RecallCounters
  now?: Date
}) {
  const reviewCount = item.reviewCount + 1

  if (!isCorrect)
    return {
      correctCount: item.correctCount,
      dueAt: now,
      lastReviewedAt: now,
      masteredAt: null,
      masteredReason: null,
      recallStage: 1 as const,
      reviewCount,
      status: 'learning' as const,
      wrongCount: item.wrongCount + 1,
    }

  const currentStage = normalizeRecallStage(item.recallStage)

  if (currentStage >= RECALL_MASTERY_STAGE)
    return {
      correctCount: item.correctCount + 1,
      dueAt: null,
      lastReviewedAt: now,
      masteredAt: now,
      masteredReason: 'recallMastery' as const,
      recallStage: RECALL_MASTERY_STAGE,
      reviewCount,
      status: 'mastered' as const,
      wrongCount: item.wrongCount,
    }

  const intervalDays = getRecallIntervalDays({
    difficulty,
    stage: currentStage,
  })

  return {
    correctCount: item.correctCount + 1,
    dueAt: addDays(now, intervalDays ?? 1),
    lastReviewedAt: now,
    masteredAt: null,
    masteredReason: null,
    recallStage: (currentStage + 1) as RecallStage,
    reviewCount,
    status: 'learning' as const,
    wrongCount: item.wrongCount,
  }
}

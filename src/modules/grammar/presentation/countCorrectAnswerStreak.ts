/** The fields the streak needs off an attempt row. */
export interface StreakAttempt {
  /** Absent on every attempt written before the field existed. */
  origin?: string | null
  verdict: string
}

/**
 * Count the run of correct answers ending now.
 *
 * Given attempts NEWEST FIRST, walk forward and stop at the first thing that is
 * not a plain correct recall answer.
 *
 * Two exclusions, both deliberate:
 *
 * - `revealed` breaks the run. The learner looked at the answer; counting it
 *   would make the one compliment in the module purchasable.
 * - `origin: 'diagnostic'` is skipped entirely rather than breaking the run. A
 *   placement test is not a performance, so it should neither build a streak nor
 *   destroy one that a learner earned before taking it.
 *
 * An ABSENT `origin` counts as recall. That is the whole reason this takes a
 * list rather than filtering in the query: a Mongoose default applies on write
 * only, so `find({origin: 'recall'})` would drop every attempt written before
 * the field existed and report a streak of zero on real history.
 *
 * Pure, so the exclusions are testable without a database.
 */
export function countCorrectAnswerStreak(
  attemptsNewestFirst: StreakAttempt[]
): number {
  let streak = 0

  for (const attempt of attemptsNewestFirst) {
    if (attempt.origin === 'diagnostic') continue

    if (attempt.verdict !== 'correct') break

    streak += 1
  }

  return streak
}

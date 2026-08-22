import { describe, expect, it } from 'vitest'

import {
  countCorrectAnswerStreak,
  type StreakAttempt,
} from './countCorrectAnswerStreak'

function correct(overrides: Partial<StreakAttempt> = {}): StreakAttempt {
  return { origin: 'recall', verdict: 'correct', ...overrides }
}

function wrong(overrides: Partial<StreakAttempt> = {}): StreakAttempt {
  return { origin: 'recall', verdict: 'wrong', ...overrides }
}

describe('countCorrectAnswerStreak', () => {
  it('counts a clean run', () => {
    expect(countCorrectAnswerStreak([correct(), correct(), correct()])).toBe(3)
  })

  it('stops at the first wrong answer', () => {
    expect(
      countCorrectAnswerStreak([correct(), correct(), wrong(), correct()])
    ).toBe(2)
  })

  it('is zero when the most recent answer was wrong', () => {
    expect(countCorrectAnswerStreak([wrong(), correct(), correct()])).toBe(0)
  })

  it('is zero with no history at all', () => {
    expect(countCorrectAnswerStreak([])).toBe(0)
  })

  it('breaks the run on a revealed answer', () => {
    // The learner looked. Counting it would make the module's only compliment
    // purchasable.
    expect(
      countCorrectAnswerStreak([
        correct(),
        correct({ verdict: 'revealed' }),
        correct(),
      ])
    ).toBe(1)
  })

  describe('the placement diagnostic', () => {
    it('does not build a streak', () => {
      // 40 assessment questions from a cold start are not a run of mastery.
      expect(
        countCorrectAnswerStreak([
          correct({ origin: 'diagnostic' }),
          correct({ origin: 'diagnostic' }),
          correct({ origin: 'diagnostic' }),
        ])
      ).toBe(0)
    })

    it('does not break a streak either', () => {
      // Skipped rather than counted as a break: taking a placement test should
      // not destroy a run the learner earned before it.
      expect(
        countCorrectAnswerStreak([
          correct(),
          wrong({ origin: 'diagnostic' }),
          correct(),
        ])
      ).toBe(2)
    })
  })

  /**
   * The bug this shape exists to prevent. `origin` was added with a Mongoose
   * default, and a default applies on write only - it does not backfill. A query
   * or a filter written as `origin === 'recall'` would drop every attempt made
   * before the field existed and report zero on months of real history.
   *
   * A fixture built with Mongoose `create()` cannot reproduce this, because the
   * default fires on create. The row has to arrive with the key genuinely
   * missing, which is what these cases are.
   */
  describe('legacy rows with no origin field', () => {
    it('counts an attempt whose origin key is absent', () => {
      expect(countCorrectAnswerStreak([{ verdict: 'correct' }])).toBe(1)
    })

    it('counts a whole run of pre-v2 attempts', () => {
      expect(
        countCorrectAnswerStreak([
          { verdict: 'correct' },
          { verdict: 'correct' },
          { verdict: 'correct' },
        ])
      ).toBe(3)
    })

    it('counts an explicitly null origin as a recall answer', () => {
      expect(
        countCorrectAnswerStreak([{ origin: null, verdict: 'correct' }])
      ).toBe(1)
    })

    it('mixes legacy and current rows in one run', () => {
      expect(
        countCorrectAnswerStreak([correct(), { verdict: 'correct' }, correct()])
      ).toBe(3)
    })
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * The learner can start a 40-question test whenever they want. If test
   * attempts counted, the streak would be farmable in a single sitting, and the
   * module's only compliment would mean nothing. If they BROKE the run, three
   * wrong answers in a voluntary test would destroy an eleven-day streak earned
   * on the daily queue - which teaches the learner not to take tests.
   *
   * Skipped, therefore. Same treatment as the retired diagnostic, for a reason
   * that is stronger now than it was then.
   */
  describe("origin 'test' (regression guard)", () => {
    const test = (verdict = 'correct') => ({ origin: 'test', verdict })

    it('does not build a streak', () => {
      expect(countCorrectAnswerStreak([test(), test(), test()])).toBe(0)
    })

    it('does not break a streak earned on the daily queue', () => {
      expect(
        countCorrectAnswerStreak([
          test('wrong'),
          test('wrong'),
          correct(),
          correct(),
          correct(),
        ])
      ).toBe(3)
    })

    it('is invisible between recall answers', () => {
      expect(
        countCorrectAnswerStreak([
          correct(),
          test('revealed'),
          test('wrong'),
          correct(),
        ])
      ).toBe(2)
    })

    it('still lets a real recall miss break the run', () => {
      expect(
        countCorrectAnswerStreak([
          correct(),
          test('correct'),
          { origin: 'recall', verdict: 'wrong' },
          correct(),
        ])
      ).toBe(1)
    })
  })
})

import { describe, expect, it } from 'vitest'

import { selectSenseiLine } from './selectSenseiLine'
import {
  SENSEI_HIGH_FRICTION_WRONG_COUNT,
  SENSEI_LINES,
  SENSEI_STALE_DAYS,
  SENSEI_STREAK_THRESHOLD,
} from './senseiLines'
import type { LearnerPresentationState } from './types'

const NOW = new Date('2026-08-21T00:00:00.000Z')
const DAY_MS = 86_400_000

function daysAgo(days: number) {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString()
}

function learner(
  overrides: Partial<LearnerPresentationState> = {}
): LearnerPresentationState {
  return {
    actorId: 'actor-1',
    correctAnswerStreak: 0,
    correctCount: 0,
    lastReviewedAt: null,
    recallStage: 3,
    recentOutcome: null,
    reviewCount: 4,
    revivalCount: 0,
    scar: null,
    status: 'learning',
    wrongCount: 0,
    ...overrides,
  }
}

function pick(overrides: Partial<LearnerPresentationState> = {}) {
  return selectSenseiLine({
    learnerState: learner(overrides),
    now: NOW,
    point: { l1Risk: 'medium' },
  })
}

describe('selectSenseiLine', () => {
  describe('precedence', () => {
    it('leads with a regression, above everything else', () => {
      // A point going backwards is the most actionable fact available, so it
      // outranks even the compliment.
      expect(
        pick({
          correctAnswerStreak: 50,
          revivalCount: 2,
          wrongCount: 40,
        }).rung
      ).toBe('regression')
    })

    it('does not call it a regression when the last answer was correct', () => {
      // Old revivals plus a correct answer now is recovery, not relapse.
      expect(pick({ recentOutcome: 'correct', revivalCount: 2 }).rung).not.toBe(
        'regression'
      )
    })

    it('puts the terminal register above the streak', () => {
      expect(pick({ correctAnswerStreak: 99, status: 'mastered' }).rung).toBe(
        'terminal'
      )
    })

    it('puts the streak above the wrong count', () => {
      // The one compliment in the table outranks criticism, or a learner who
      // fought back from a bad start never hears it.
      expect(
        pick({
          correctAnswerStreak: SENSEI_STREAK_THRESHOLD,
          wrongCount: 30,
        }).rung
      ).toBe('streak')
    })

    it('puts the wrong count above staleness', () => {
      expect(
        pick({
          lastReviewedAt: daysAgo(SENSEI_STALE_DAYS + 10),
          wrongCount: SENSEI_HIGH_FRICTION_WRONG_COUNT,
        }).rung
      ).toBe('highFriction')
    })

    it('puts staleness above the untouched register', () => {
      expect(
        pick({
          lastReviewedAt: daysAgo(SENSEI_STALE_DAYS),
          status: null,
        }).rung
      ).toBe('stale')
    })
  })

  describe('each rung', () => {
    it('says the regression line', () => {
      expect(pick({ revivalCount: 1 }).line).toBe(SENSEI_LINES.regression)
    })

    it('distinguishes mastered from already-known', () => {
      expect(pick({ status: 'mastered' }).line).toBe(SENSEI_LINES.mastered)
      expect(pick({ status: 'alreadyKnow' }).line).toBe(
        SENSEI_LINES.alreadyKnow
      )
    })

    it('gives the one compliment at the threshold, not before', () => {
      expect(pick({ correctAnswerStreak: SENSEI_STREAK_THRESHOLD }).rung).toBe(
        'streak'
      )
      expect(
        pick({ correctAnswerStreak: SENSEI_STREAK_THRESHOLD - 1 }).rung
      ).not.toBe('streak')
    })

    it('names the actual number of wrong answers', () => {
      expect(pick({ wrongCount: 11 }).line).toContain('11')
    })

    it('names the actual number of stale days', () => {
      const selection = pick({ lastReviewedAt: daysAgo(40) })

      expect(selection.rung).toBe('stale')
      expect(selection.line).toContain('40')
    })

    it('says the untouched line for a point never tried', () => {
      const selection = pick({ lastReviewedAt: null, status: null })

      expect(selection.rung).toBe('untouched')
      expect(selection.line).toBe(SENSEI_LINES.untouched)
    })
  })

  describe('the default fall-through', () => {
    it('always returns a line, so a verdict panel is never empty', () => {
      const selection = pick()

      expect(selection.rung).toBe('default')
      expect(selection.line.length).toBeGreaterThan(0)
    })

    it('has a distinct default per risk level', () => {
      const lines = (['low', 'medium', 'high'] as const).map(
        l1Risk =>
          selectSenseiLine({
            learnerState: learner(),
            now: NOW,
            point: { l1Risk },
          }).line
      )

      expect(new Set(lines).size).toBe(3)
    })

    it('reads the observed judgment, not the authored risk', () => {
      // The learner told the module this point is brutal. He should say so.
      expect(
        selectSenseiLine({
          learnerState: learner(),
          now: NOW,
          point: { l1Risk: 'low', l1RiskObserved: 'high' },
        }).line
      ).toBe(SENSEI_LINES.default.high)
    })
  })

  it('ignores an unparseable timestamp rather than reporting NaN days', () => {
    const selection = pick({ lastReviewedAt: 'not-a-date' })

    expect(selection.rung).not.toBe('stale')
    expect(selection.line).not.toContain('NaN')
  })

  it('never uses an exclamation mark', () => {
    // The register is load-bearing: one cheerful line and the character is gone.
    const lines = [
      pick({ revivalCount: 1 }),
      pick({ status: 'mastered' }),
      pick({ correctAnswerStreak: 20 }),
      pick({ wrongCount: 11 }),
      pick({ lastReviewedAt: daysAgo(60) }),
      pick({ status: null }),
      pick(),
    ]

    for (const selection of lines)
      expect(selection.line, selection.rung).not.toContain('!')
  })
})

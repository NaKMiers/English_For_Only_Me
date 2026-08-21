import { describe, expect, it } from 'vitest'

import { GRAMMAR_DIAGNOSTIC_CORRECT_STAGE } from '@/modules/grammar/constants'

import {
  seedFromDiagnostic,
  summariseDiagnostic,
  type DiagnosticOutcome,
} from './scoreDiagnostic'

const NOW = new Date('2026-08-20T00:00:00.000Z')
const DAY_MS = 86_400_000

function outcome(
  overrides: Partial<DiagnosticOutcome> = {}
): DiagnosticOutcome {
  return {
    cefrLevel: 'B1',
    isCorrect: true,
    l1Risk: 'medium',
    pointSlug: 'present-perfect-simple',
    reviewStatus: 'reviewed',
    ...overrides,
  }
}

function daysFromNow(date: Date) {
  return Math.round((date.getTime() - NOW.getTime()) / DAY_MS)
}

describe('seedFromDiagnostic', () => {
  it('sends a wrong answer to the bottom of the ladder, due now', () => {
    const seed = seedFromDiagnostic({
      now: NOW,
      outcome: outcome({ isCorrect: false }),
    })

    expect(seed.recallStage).toBe(1)
    expect(seed.dueAt).toEqual(NOW)
  })

  // The core design decision: a correct answer is evidence, not proof.
  it('seeds a correct answer mid-ladder rather than marking it known', () => {
    const seed = seedFromDiagnostic({ now: NOW, outcome: outcome() })

    expect(seed.recallStage).toBe(GRAMMAR_DIAGNOSTIC_CORRECT_STAGE)
    expect(seed.recallStage).toBeGreaterThan(1)
    expect(seed.recallStage).toBeLessThan(7)
  })

  it('schedules a correct answer days out, not tomorrow', () => {
    const seed = seedFromDiagnostic({ now: NOW, outcome: outcome() })

    expect(daysFromNow(seed.dueAt)).toBeGreaterThan(1)
  })

  it('brings a high-risk correct point back sooner than a low-risk one', () => {
    const high = seedFromDiagnostic({
      now: NOW,
      outcome: outcome({ l1Risk: 'high' }),
    })
    const low = seedFromDiagnostic({
      now: NOW,
      outcome: outcome({ l1Risk: 'low' }),
    })

    expect(high.dueAt.getTime()).toBeLessThan(low.dueAt.getTime())
  })

  it('keeps the point slug on the seed', () => {
    const seed = seedFromDiagnostic({
      now: NOW,
      outcome: outcome({ pointSlug: 'zero-article' }),
    })

    expect(seed.pointSlug).toBe('zero-article')
  })
})

describe('summariseDiagnostic', () => {
  it('handles an empty diagnostic without dividing by zero', () => {
    const summary = summariseDiagnostic([])

    expect(summary).toMatchObject({
      byLevel: [],
      byRisk: [],
      correct: 0,
      total: 0,
      weakestLevels: [],
      weakestRisks: [],
    })
  })

  it('counts totals and correct answers', () => {
    const summary = summariseDiagnostic([
      outcome({ isCorrect: true }),
      outcome({ isCorrect: false, pointSlug: 'b' }),
      outcome({ isCorrect: true, pointSlug: 'c' }),
    ])

    expect(summary.total).toBe(3)
    expect(summary.correct).toBe(2)
  })

  it('breaks accuracy down by CEFR level', () => {
    const summary = summariseDiagnostic([
      outcome({ cefrLevel: 'A1', isCorrect: true }),
      outcome({ cefrLevel: 'A1', isCorrect: true, pointSlug: 'b' }),
      outcome({ cefrLevel: 'C1', isCorrect: false, pointSlug: 'c' }),
    ])

    expect(summary.byLevel).toEqual([
      { cefrLevel: 'A1', correct: 2, total: 2 },
      { cefrLevel: 'C1', correct: 0, total: 1 },
    ])
  })

  it('breaks accuracy down by L1 risk', () => {
    const summary = summariseDiagnostic([
      outcome({ isCorrect: false, l1Risk: 'high' }),
      outcome({ isCorrect: false, l1Risk: 'high', pointSlug: 'b' }),
      outcome({ isCorrect: true, l1Risk: 'low', pointSlug: 'c' }),
    ])

    expect(summary.byRisk).toEqual([
      { correct: 0, l1Risk: 'high', total: 2 },
      { correct: 1, l1Risk: 'low', total: 1 },
    ])
  })

  // A raw score is not actionable; naming the weak areas is.
  it('names levels scoring below half as weakest', () => {
    const summary = summariseDiagnostic([
      outcome({ cefrLevel: 'A1', isCorrect: true }),
      outcome({ cefrLevel: 'B2', isCorrect: false, pointSlug: 'b' }),
      outcome({ cefrLevel: 'B2', isCorrect: false, pointSlug: 'c' }),
      outcome({ cefrLevel: 'B2', isCorrect: true, pointSlug: 'd' }),
    ])

    expect(summary.weakestLevels).toEqual(['B2'])
  })

  it('names high-interference risk as weak when accuracy is below half there', () => {
    const summary = summariseDiagnostic([
      outcome({ isCorrect: false, l1Risk: 'high' }),
      outcome({ isCorrect: false, l1Risk: 'high', pointSlug: 'b' }),
      outcome({ isCorrect: true, l1Risk: 'medium', pointSlug: 'c' }),
    ])

    expect(summary.weakestRisks).toEqual(['high'])
  })

  it('does not flag an area scoring exactly half', () => {
    const summary = summariseDiagnostic([
      outcome({ cefrLevel: 'B1', isCorrect: true }),
      outcome({ cefrLevel: 'B1', isCorrect: false, pointSlug: 'b' }),
    ])

    expect(summary.weakestLevels).toEqual([])
  })
})

/**
 * The result screen is the module's most persuasive moment and it is built
 * entirely on lessons no human has read. This number is what keeps the claim
 * honest, so it is worth the same rigour as the score itself.
 */
describe('unverifiedCount', () => {
  it('is zero when every tested point is reviewed', () => {
    const summary = summariseDiagnostic([
      outcome({ pointSlug: 'a', reviewStatus: 'reviewed' }),
      outcome({ pointSlug: 'b', reviewStatus: 'reviewed' }),
    ])

    expect(summary.unverifiedCount).toBe(0)
  })

  it('counts every point when none are reviewed', () => {
    // The launch state: all 184 lessons are unverified.
    const summary = summariseDiagnostic([
      outcome({ pointSlug: 'a', reviewStatus: 'unverified' }),
      outcome({ pointSlug: 'b', reviewStatus: 'unverified' }),
      outcome({ pointSlug: 'c', reviewStatus: 'unverified' }),
    ])

    expect(summary.unverifiedCount).toBe(3)
    expect(summary.total).toBe(3)
  })

  it('counts only the unverified half of a mixed set', () => {
    const summary = summariseDiagnostic([
      outcome({ pointSlug: 'a', reviewStatus: 'reviewed' }),
      outcome({ pointSlug: 'b', reviewStatus: 'unverified' }),
      outcome({ pointSlug: 'c', reviewStatus: 'unverified' }),
    ])

    expect(summary.unverifiedCount).toBe(2)
  })

  it('counts rules, not answers', () => {
    // Two drills from one point is one unverified RULE. Saying "2 of the 2
    // rules we tested" when only one rule was tested overstates the caveat as
    // badly as omitting it understates it.
    const summary = summariseDiagnostic([
      outcome({ pointSlug: 'zero-article', reviewStatus: 'unverified' }),
      outcome({ pointSlug: 'zero-article', reviewStatus: 'unverified' }),
    ])

    expect(summary.unverifiedCount).toBe(1)
  })

  it('is zero for an empty diagnostic', () => {
    expect(summariseDiagnostic([]).unverifiedCount).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'

import { resolveDrillBeat } from './resolveDrillBeat'
import { SENSEI_LINES } from './senseiLines'

function beat(
  overrides: Partial<Parameters<typeof resolveDrillBeat>[0]> = {}
) {
  return resolveDrillBeat({
    stageAfter: 3,
    stageBefore: 2,
    verdict: 'correct',
    ...overrides,
  })
}

describe('resolveDrillBeat', () => {
  it('lands a hit on a correct answer', () => {
    expect(beat()).toMatchObject({
      creatureOutcome: 'correct',
      line: SENSEI_LINES.correct,
      stamp: 'Hit',
    })
  })

  /**
   * The asymmetry is the teaching. A wrong answer leaves the creature unmoved -
   * the correction diff underneath does the work - and stamping something on a
   * failure would reward the attempt rather than address the mistake.
   */
  it('leaves the creature unmoved on a wrong answer, with no stamp', () => {
    const result = beat({ stageAfter: 1, stageBefore: 1, verdict: 'wrong' })

    expect(result.creatureOutcome).toBe('wrong')
    expect(result.stamp).toBeNull()
    expect(result.line).toBe(SENSEI_LINES.wrong)
  })

  it('withholds everything on a revealed answer', () => {
    // No praise, no scolding, no motion. The learner looked.
    const result = beat({ stageAfter: 1, stageBefore: 1, verdict: 'revealed' })

    expect(result.creatureOutcome).toBeNull()
    expect(result.stamp).toBeNull()
    expect(result.line).toBe(SENSEI_LINES.revealed)
  })

  describe('regression', () => {
    it('outranks a wrong answer', () => {
      // A rule you had and lost is the most useful thing to be told about.
      const result = beat({ stageAfter: 1, stageBefore: 5, verdict: 'wrong' })

      expect(result.isRegression).toBe(true)
      expect(result.line).toBe(SENSEI_LINES.regression)
      expect(result.creatureOutcome).toBe('revive')
    })

    it('outranks a revealed answer too', () => {
      // A regression is a ladder movement, not a verdict, so it can accompany
      // either.
      expect(
        beat({ stageAfter: 1, stageBefore: 6, verdict: 'revealed' })
      ).toMatchObject({ isRegression: true, line: SENSEI_LINES.regression })
    })

    it('is never reported on a correct answer', () => {
      // The ladder does not move backwards on a correct answer, and reporting a
      // relapse alongside a win would be incoherent.
      expect(
        beat({ stageAfter: 4, stageBefore: 4, verdict: 'correct' }).isRegression
      ).toBe(false)
    })

    it('is not triggered by a stage that merely stayed put', () => {
      expect(
        beat({ stageAfter: 1, stageBefore: 1, verdict: 'wrong' }).isRegression
      ).toBe(false)
    })
  })

  it('gives every outcome a distinct face', () => {
    const expressions = new Set([
      beat().expression,
      beat({ stageAfter: 1, stageBefore: 1, verdict: 'wrong' }).expression,
      beat({ stageAfter: 1, stageBefore: 1, verdict: 'revealed' }).expression,
      beat({ stageAfter: 1, stageBefore: 5, verdict: 'wrong' }).expression,
    ])

    expect(expressions.size).toBe(4)
  })

  it('always returns a line', () => {
    // An empty speech bubble is worse than a blunt one.
    for (const verdict of ['correct', 'wrong', 'revealed'] as const)
      expect(
        beat({ verdict }).line.length,
        verdict
      ).toBeGreaterThan(0)
  })
})

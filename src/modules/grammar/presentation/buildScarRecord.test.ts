import { describe, expect, it } from 'vitest'

import { buildScarRecord, type ScarAttempt } from './buildScarRecord'

const DAY_MS = 86_400_000
const START = new Date('2026-06-01T00:00:00.000Z').getTime()

function day(offset: number) {
  return new Date(START + offset * DAY_MS)
}

function attempt(overrides: Partial<ScarAttempt> = {}): ScarAttempt {
  return {
    at: day(0),
    drillId: 'd1',
    matchedAnswer: null,
    stageAfter: 1,
    stageBefore: 1,
    userAnswer: 'a durian',
    verdict: 'wrong',
    ...overrides,
  }
}

const PROMPTS = new Map([
  ['d1', 'I ate ___ durian.'],
  ['d2', 'She works in ___ hospital.'],
])

function build(attempts: ScarAttempt[], promptByDrillId = PROMPTS) {
  return buildScarRecord({ attempts, promptByDrillId })
}

describe('buildScarRecord', () => {
  describe('empty history', () => {
    // The common case on a first visit, so it gets the same rigour as the rest.
    it('returns every field absent for a learner with no attempts', () => {
      expect(build([])).toEqual({
        conquered: null,
        firstWrong: null,
        revivals: 0,
        worstTrap: null,
      })
    })

    it('reports no first wrong when every answer was correct', () => {
      expect(
        build([attempt({ userAnswer: 'the durian', verdict: 'correct' })])
          .firstWrong
      ).toBeNull()
    })
  })

  describe('firstWrong', () => {
    it('is the earliest wrong attempt regardless of input order', () => {
      const scar = build([
        attempt({ at: day(5), userAnswer: 'later mistake' }),
        attempt({ at: day(1), userAnswer: 'first mistake' }),
        attempt({ at: day(3), userAnswer: 'middle mistake' }),
      ])

      expect(scar.firstWrong?.userAnswer).toBe('first mistake')
      expect(scar.firstWrong?.at).toBe(day(1).toISOString())
    })

    it('carries the prompt and the answer that would have been accepted', () => {
      const scar = build([
        attempt({ drillId: 'd2', matchedAnswer: 'the hospital' }),
      ])

      expect(scar.firstWrong?.prompt).toBe('She works in ___ hospital.')
      expect(scar.firstWrong?.matchedAnswer).toBe('the hospital')
    })

    it('ignores a wrong attempt with no recorded answer', () => {
      expect(build([attempt({ userAnswer: null })]).firstWrong).toBeNull()
    })
  })

  describe('worstTrap', () => {
    it('needs two occurrences before calling it a pattern', () => {
      // One wrong answer is a slip. Naming it a pattern would be the module
      // inventing a weakness the learner does not have.
      expect(build([attempt({ userAnswer: 'a durian' })]).worstTrap).toBeNull()

      const twice = build([
        attempt({ at: day(1), userAnswer: 'a durian' }),
        attempt({ at: day(2), userAnswer: 'a durian' }),
      ])

      expect(twice.worstTrap).toMatchObject({
        occurrences: 2,
        userAnswer: 'a durian',
      })
    })

    it('groups answers differing only by case and whitespace', () => {
      const scar = build([
        attempt({ at: day(1), userAnswer: 'a durian' }),
        attempt({ at: day(2), userAnswer: 'A  Durian' }),
        attempt({ at: day(3), userAnswer: ' a durian ' }),
      ])

      expect(scar.worstTrap?.occurrences).toBe(3)
    })

    it('does not group answers differing by punctuation', () => {
      // The grader treats these as one answer; the archive is quoting what the
      // learner actually typed, so they stay distinct.
      const scar = build([
        attempt({ at: day(1), userAnswer: 'a durian' }),
        attempt({ at: day(2), userAnswer: 'a durian?' }),
      ])

      expect(scar.worstTrap).toBeNull()
    })

    it('picks the most frequent answer, not the most recent', () => {
      const scar = build([
        attempt({ at: day(1), userAnswer: 'a durian' }),
        attempt({ at: day(2), userAnswer: 'a durian' }),
        attempt({ at: day(3), userAnswer: 'a durian' }),
        attempt({ at: day(9), userAnswer: 'durian' }),
        attempt({ at: day(10), userAnswer: 'durian' }),
      ])

      expect(scar.worstTrap?.userAnswer).toBe('a durian')
      expect(scar.worstTrap?.occurrences).toBe(3)
    })

    it('breaks a tie on the most recent attempt', () => {
      // A trap the learner has moved past should not outrank a live one.
      const scar = build([
        attempt({ at: day(1), userAnswer: 'old trap' }),
        attempt({ at: day(2), userAnswer: 'old trap' }),
        attempt({ at: day(20), userAnswer: 'live trap' }),
        attempt({ at: day(21), userAnswer: 'live trap' }),
      ])

      expect(scar.worstTrap?.userAnswer).toBe('live trap')
    })

    it('quotes the most recent wording of the same mistake', () => {
      const scar = build([
        attempt({ at: day(1), userAnswer: 'a durian' }),
        attempt({ at: day(8), userAnswer: 'A Durian' }),
      ])

      expect(scar.worstTrap?.userAnswer).toBe('A Durian')
    })

    it('ignores correct answers entirely', () => {
      expect(
        build([
          attempt({ at: day(1), userAnswer: 'the durian', verdict: 'correct' }),
          attempt({ at: day(2), userAnswer: 'the durian', verdict: 'correct' }),
        ]).worstTrap
      ).toBeNull()
    })
  })

  describe('conquered', () => {
    it('is the first crossing from the lower half of the ladder to the upper', () => {
      const scar = build([
        attempt({ at: day(1), stageAfter: 3, stageBefore: 2 }),
        attempt({
          at: day(2),
          stageAfter: 5,
          stageBefore: 4,
          userAnswer: 'the durian',
          verdict: 'correct',
        }),
        attempt({ at: day(3), stageAfter: 6, stageBefore: 5 }),
      ])

      expect(scar.conquered?.at).toBe(day(2).toISOString())
      expect(scar.conquered?.userAnswer).toBe('the durian')
    })

    it('is absent while the learner has never crossed stage 4', () => {
      expect(
        build([attempt({ stageAfter: 4, stageBefore: 3 })]).conquered
      ).toBeNull()
    })

    it('reports the FIRST crossing even after a relapse and a second win', () => {
      const scar = build([
        attempt({
          at: day(1),
          stageAfter: 5,
          stageBefore: 4,
          userAnswer: 'first win',
        }),
        attempt({ at: day(2), stageAfter: 1, stageBefore: 5 }),
        attempt({
          at: day(3),
          stageAfter: 5,
          stageBefore: 4,
          userAnswer: 'second win',
        }),
      ])

      expect(scar.conquered?.userAnswer).toBe('first win')
    })
  })

  describe('revivals', () => {
    it('counts every backwards move on the ladder', () => {
      const scar = build([
        attempt({ at: day(1), stageAfter: 1, stageBefore: 5 }),
        attempt({ at: day(2), stageAfter: 2, stageBefore: 1 }),
        attempt({ at: day(3), stageAfter: 1, stageBefore: 4 }),
      ])

      expect(scar.revivals).toBe(2)
    })

    it('counts a regression that came from a revealed answer', () => {
      // A regression is a ladder movement, not a verdict. It can accompany a
      // wrong answer or a revealed one.
      expect(
        build([
          attempt({ stageAfter: 1, stageBefore: 6, verdict: 'revealed' }),
        ]).revivals
      ).toBe(1)
    })

    it('is zero for a learner who has only ever moved forward', () => {
      expect(
        build([attempt({ stageAfter: 3, stageBefore: 2 })]).revivals
      ).toBe(0)
    })
  })

  describe('a drill that no longer exists', () => {
    /**
     * Happens on every content regeneration. The learner's answer is still real
     * and still worth quoting; the prompt is simply gone. Rendering a
     * placeholder prompt would attribute a question to them that they never saw.
     */
    it('returns a null prompt rather than a placeholder', () => {
      const scar = build([
        attempt({ at: day(1), drillId: 'deleted', userAnswer: 'a durian' }),
        attempt({ at: day(2), drillId: 'deleted', userAnswer: 'a durian' }),
      ])

      expect(scar.firstWrong).toMatchObject({
        prompt: null,
        userAnswer: 'a durian',
      })
      expect(scar.worstTrap).toMatchObject({ prompt: null, occurrences: 2 })
    })
  })

  /**
   * MANDATORY, regression-class. This record is rendered into a page, and the
   * prompt it carries comes off `GrammarDrillRecord`, which sits next to
   * `target` and `acceptedAnswers`. Widening the input to whole drills would
   * ship every answer to the browser and nothing would look broken.
   */
  it('cannot carry an answer key, because it only ever receives prompts', () => {
    const scar = build([
      attempt({ at: day(1), userAnswer: 'a durian' }),
      attempt({ at: day(2), userAnswer: 'a durian' }),
      attempt({
        at: day(3),
        stageAfter: 5,
        stageBefore: 4,
        userAnswer: 'the durian',
        verdict: 'correct',
      }),
    ])
    const serialised = JSON.stringify(scar)

    expect(serialised).not.toContain('acceptedAnswers')
    expect(serialised).not.toContain('target')
    expect(Object.keys(scar).sort()).toEqual([
      'conquered',
      'firstWrong',
      'revivals',
      'worstTrap',
    ])
  })
})

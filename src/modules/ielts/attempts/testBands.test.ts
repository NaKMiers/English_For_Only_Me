import { describe, expect, it } from 'vitest'

import { bandsFromAttempts, bestBandsByTest } from './testBands'

describe('bestBandsByTest', () => {
  it('keeps the highest band per test and skill', () => {
    expect(
      bestBandsByTest([
        { testId: 'a', skill: 'listening', band: 6 },
        { testId: 'a', skill: 'listening', band: 7.5 },
        { testId: 'a', skill: 'listening', band: 7 },
        { testId: 'a', skill: 'writing', band: 6.5 },
        { testId: 'b', skill: 'reading', band: 5.5 },
      ])
    ).toEqual({
      a: { listening: 7.5, writing: 6.5 },
      b: { reading: 5.5 },
    })
  })

  it('returns an empty map without attempts', () => {
    expect(bestBandsByTest([])).toEqual({})
  })
})

describe('bandsFromAttempts', () => {
  it('takes the best band per skill from finished attempts only', () => {
    expect(
      bandsFromAttempts('t1', [
        { band: 6, skill: 'reading', status: 'submitted' },
        { band: 7, skill: 'reading', status: 'submitted' },
        { band: 8, skill: 'listening', status: 'in_progress' },
      ])
    ).toEqual({ t1: { reading: 7 } })
  })
})

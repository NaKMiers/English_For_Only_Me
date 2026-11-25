import { describe, expect, it } from 'vitest'

import { bestBandsByTest } from './testBands'

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

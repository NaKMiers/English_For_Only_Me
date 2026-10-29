import { describe, expect, it } from 'vitest'

import { shapeWeaknessStats } from './shapeWeakness'

describe('shapeWeaknessStats', () => {
  it('returns an empty shape with no attempts', () => {
    expect(shapeWeaknessStats([])).toEqual({
      rows: [],
      weakest: [],
      totalQuestions: 0,
    })
  })

  it('ranks weakest first and hides types under the sample minimum', () => {
    const stats = shapeWeaknessStats([
      { skill: 'reading', type: 'true-false-not-given', correct: 3, total: 10 },
      { skill: 'reading', type: 'matching-headings', correct: 6, total: 7 },
      { skill: 'listening', type: 'form-completion', correct: 1, total: 4 },
      { skill: 'writing', type: 'x', correct: 0, total: 9 },
    ])

    expect(stats.weakest.map(row => row.type)).toEqual([
      'true-false-not-given',
      'matching-headings',
    ])
    expect(stats.rows.at(-1)).toMatchObject({
      type: 'form-completion',
      accuracy: null,
    })
    expect(stats.totalQuestions).toBe(21)
  })
})

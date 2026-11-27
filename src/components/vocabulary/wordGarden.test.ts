import { describe, expect, test } from 'vitest'

import { advanceGardenPosition, wordGardenPosition } from './wordGarden'

describe('wordGardenPosition', () => {
  test('starts as a seed', () => {
    expect(wordGardenPosition(100)).toEqual({
      index: 0,
      left: 400,
      progress: 0.2,
    })
  })

  test('reaches a stage exactly at its threshold', () => {
    expect(wordGardenPosition(2500)).toMatchObject({ index: 3, left: 750 })
  })

  test('stays a forest past the last stage', () => {
    expect(wordGardenPosition(9000)).toEqual({
      index: 6,
      left: 0,
      progress: 1,
    })
  })
})

describe('advanceGardenPosition', () => {
  test('newly mastered words move the garden, and can cross a stage', () => {
    const result = advanceGardenPosition(498, 3)

    expect(result.known).toBe(501)
    expect(result.before.index).toBe(0)
    expect(result.after.index).toBe(1)
    expect(result.stageUp).toBe(true)
  })

  test('a session that masters nothing adds nothing', () => {
    const result = advanceGardenPosition(120, 0)

    expect(result.known).toBe(120)
    expect(result.after).toEqual(result.before)
    expect(result.stageUp).toBe(false)
  })
})

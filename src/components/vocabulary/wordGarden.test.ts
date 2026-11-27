import { describe, expect, test } from 'vitest'

import { wordGardenPosition } from './wordGarden'

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

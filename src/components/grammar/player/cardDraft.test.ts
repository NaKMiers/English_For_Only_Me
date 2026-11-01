import { describe, expect, it } from 'vitest'

import { placeTile } from './cardDraft'

describe('placeTile', () => {
  it('inserts a bank tile at the dropped position', () => {
    expect(placeTile([4, 1, 7], 2, 0)).toEqual([2, 4, 1, 7])
    expect(placeTile([4, 1, 7], 2, 2)).toEqual([4, 1, 2, 7])
    expect(placeTile([4, 1, 7], 2, 3)).toEqual([4, 1, 7, 2])
  })

  it('moves a tile already in the line forward and back', () => {
    expect(placeTile([4, 1, 7, 3], 4, 3)).toEqual([1, 7, 4, 3])
    expect(placeTile([4, 1, 7, 3], 4, 4)).toEqual([1, 7, 3, 4])
    expect(placeTile([4, 1, 7, 3], 3, 1)).toEqual([4, 3, 1, 7])
  })

  it('leaves the line alone when dropped on its own place', () => {
    expect(placeTile([4, 1, 7], 1, 1)).toEqual([4, 1, 7])
    expect(placeTile([4, 1, 7], 1, 2)).toEqual([4, 1, 7])
  })

  it('clamps an out-of-range position', () => {
    expect(placeTile([4, 1], 9, 10)).toEqual([4, 1, 9])
    expect(placeTile([4, 1], 9, -3)).toEqual([9, 4, 1])
  })
})

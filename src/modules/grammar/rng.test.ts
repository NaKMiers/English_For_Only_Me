import { describe, expect, it } from 'vitest'

import { createRng, sample, shuffle } from './rng'

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(42)
    const b = createRng(42)

    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(7)

    for (let index = 0; index < 1000; index += 1) {
      const value = rng()

      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('shuffles without losing or duplicating items, and does not mutate', () => {
    const items = [1, 2, 3, 4, 5, 6]
    const result = shuffle(items, createRng(3))

    expect([...result].sort()).toEqual(items)
    expect(items).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('samples at most the available items', () => {
    expect(sample([1, 2, 3], 5, createRng(1))).toHaveLength(3)
    expect(sample([1, 2, 3], 2, createRng(1))).toHaveLength(2)
    expect(sample([1, 2, 3], -1, createRng(1))).toEqual([])
  })
})

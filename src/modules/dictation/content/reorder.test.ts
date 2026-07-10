import { describe, expect, it } from 'vitest'

import { reorderIds } from './reorder'

describe('reorderIds', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('moves an item up to the target position', () => {
    expect(reorderIds(ids, 'd', 'b')).toEqual(['a', 'd', 'b', 'c'])
  })

  it('inserts the dragged item just before the target', () => {
    expect(reorderIds(ids, 'a', 'c')).toEqual(['b', 'a', 'c', 'd'])
  })

  it('is a no-op when dragged onto itself', () => {
    expect(reorderIds(ids, 'b', 'b')).toBe(ids)
  })

  it('returns the input unchanged when the target is missing', () => {
    expect(reorderIds(ids, 'a', 'zzz')).toBe(ids)
  })
})

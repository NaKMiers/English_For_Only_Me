import { describe, expect, test } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  test('merges conditional class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2 text-sm', false && 'hidden', 'px-4')).toBe('text-sm px-4')
  })

  test.each([
    ['rounded-lg', 'rounded-control', 'rounded-control'],
    ['rounded-panel', 'rounded-control', 'rounded-control'],
    ['rounded-none', 'rounded-panel', 'rounded-panel'],
    ['rounded-t-xl', 'rounded-t-panel', 'rounded-t-panel'],
  ])('lets a sticker radius role replace %s with %s', (base, next, merged) => {
    expect(cn(base, next)).toBe(merged)
  })

  test('keeps a variant-scoped radius next to the unscoped role', () => {
    expect(cn('data-[side=right]:rounded-l-panel', 'rounded-panel')).toBe(
      'data-[side=right]:rounded-l-panel rounded-panel'
    )
  })
})

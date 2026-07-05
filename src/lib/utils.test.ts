import { describe, expect, test } from 'vitest'

import { cn } from './utils'

describe('cn', () => {
  test('merges conditional class names and resolves Tailwind conflicts', () => {
    expect(cn('px-2 text-sm', false && 'hidden', 'px-4')).toBe('text-sm px-4')
  })
})

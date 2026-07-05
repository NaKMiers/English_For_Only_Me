import { describe, expect, test } from 'vitest'

import { normalizeAnswer } from './normalizeAnswer'

describe('normalizeAnswer', () => {
  test('forgives punctuation, capitalization, unicode apostrophes, and whitespace', () => {
    expect(normalizeAnswer('  I\u2019m ready, now. ').normalizedText).toBe(
      'i am ready now'
    )
  })

  test('normalizes number variants', () => {
    expect(
      normalizeAnswer('The second task has two parts.').normalizedText
    ).toBe('the 2 task has 2 parts')
    expect(normalizeAnswer('The 2nd task has 2 parts.').normalizedText).toBe(
      'the 2 task has 2 parts'
    )
  })

  test('normalizes common British and American spelling variants', () => {
    expect(normalizeAnswer('My favourite colour is grey.').normalizedText).toBe(
      'my favorite color is gray'
    )
  })
})

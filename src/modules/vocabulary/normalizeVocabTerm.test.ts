import { describe, expect, test } from 'vitest'

import { normalizeVocabTerm } from './normalizeVocabTerm'

describe('normalizeVocabTerm', () => {
  test('normalizes spaces, casing, and punctuation', () => {
    expect(normalizeVocabTerm('  "Example!"  ')).toEqual({
      entryType: 'word',
      normalizedTerm: 'example',
      term: 'example',
    })
  })

  test('keeps phrase support', () => {
    expect(normalizeVocabTerm('  Look   Up  ')).toEqual({
      entryType: 'phrase',
      normalizedTerm: 'look up',
      term: 'look up',
    })
  })

  test('rejects empty, unsafe, and too-long terms', () => {
    expect(normalizeVocabTerm('')).toBeNull()
    expect(normalizeVocabTerm('hello123')).toBeNull()
    expect(normalizeVocabTerm('a'.repeat(81))).toBeNull()
  })
})

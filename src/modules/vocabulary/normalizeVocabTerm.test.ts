import { describe, expect, test } from 'vitest'

import {
  isEnglishTermCandidate,
  normalizeVocabTerm,
} from './normalizeVocabTerm'

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

describe('isEnglishTermCandidate', () => {
  test('accepts plain English words and phrases', () => {
    for (const term of ['run', 'Account', "don't", 'co-op', 'ice cream'])
      expect(isEnglishTermCandidate(term)).toBe(true)
  })

  test('rejects other scripts, accents, and non-letter input', () => {
    for (const term of [
      'mặt', // Vietnamese diacritics
      '子供', // Japanese
      'привет', // Cyrillic
      'café', // accented (non-ASCII)
      '123',
      'word1',
      '',
      '!!!',
    ])
      expect(isEnglishTermCandidate(term)).toBe(false)
  })
})

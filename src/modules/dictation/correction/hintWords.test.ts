import { describe, expect, test } from 'vitest'

import { filterHintsToSentence, isWordInSentence } from './hintWords'

const sentence = 'They flew from London to Paris with Sarah.'

describe('filterHintsToSentence', () => {
  test('keeps only words present in the sentence', () => {
    expect(
      filterHintsToSentence(sentence, ['London', 'Sarah', 'Berlin'])
    ).toEqual(['London', 'Sarah'])
  })

  test('preserves the caller order (so drag-to-reorder sticks)', () => {
    expect(
      filterHintsToSentence(sentence, ['Sarah', 'They', 'London'])
    ).toEqual(['Sarah', 'They', 'London'])
  })

  test('is case- and punctuation-insensitive but keeps the sentence surface form', () => {
    expect(filterHintsToSentence(sentence, ['london', 'PARIS'])).toEqual([
      'London',
      'Paris',
    ])
  })

  test('dedupes repeated hints', () => {
    expect(
      filterHintsToSentence('London calling, London calling.', [
        'London',
        'london',
      ])
    ).toEqual(['London'])
  })

  test('empty input yields an empty list', () => {
    expect(filterHintsToSentence(sentence, [])).toEqual([])
  })
})

describe('isWordInSentence', () => {
  test('true for a word in the sentence', () => {
    expect(isWordInSentence(sentence, 'paris')).toBe(true)
  })

  test('false for a word not in the sentence', () => {
    expect(isWordInSentence(sentence, 'Tokyo')).toBe(false)
  })
})

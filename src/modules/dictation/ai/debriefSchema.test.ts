import { describe, expect, test } from 'vitest'

import {
  dictationDebriefOutputSchema,
  parseDictationDebriefJson,
} from './debriefSchema'

const validDebrief = {
  caveats: ['Based on saved attempts only.'],
  confidence: 0.78,
  contentSummary: 'The video explains how city transport changed over time.',
  keyVocabulary: [
    {
      example: 'The speaker mentioned a temporary route.',
      meaning: 'lasting for a limited time',
      term: 'temporary',
    },
  ],
  listeningTraps: ['Connected speech hid function words.'],
  nextActions: ['Replay the hardest three segments at 0.75 speed.'],
  weakPatterns: ['Missing short prepositions before nouns.'],
}

describe('dictationDebriefOutputSchema', () => {
  test('accepts a valid structured debrief sample', () => {
    expect(dictationDebriefOutputSchema.parse(validDebrief)).toEqual(
      validDebrief
    )
    expect(parseDictationDebriefJson(JSON.stringify(validDebrief))).toEqual(
      validDebrief
    )
  })

  test('rejects malformed output', () => {
    expect(() =>
      dictationDebriefOutputSchema.parse({
        ...validDebrief,
        confidence: 2,
        nextActions: [],
      })
    ).toThrow()
  })
})

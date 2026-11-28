import { describe, expect, test } from 'vitest'

import {
  DICTATION_DEBRIEF_LIMITS,
  dictationDebriefOutputSchema,
  parseDictationDebriefJson,
  parseDictationDebriefOutput,
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

describe('parseDictationDebriefOutput', () => {
  // The failure seen live with qwen3.8-flash: one weakPatterns item past 220.
  const longItem = `${'Missing the unstressed function words '.repeat(7)}in fast speech.`

  test('cuts an over-long list item at a word boundary instead of failing', () => {
    const parsed = parseDictationDebriefOutput({
      ...validDebrief,
      weakPatterns: ['Short pattern.', longItem],
    })
    const cut = parsed.weakPatterns[1]

    expect(longItem.length).toBeGreaterThan(DICTATION_DEBRIEF_LIMITS.listItem)
    expect(cut.length).toBeLessThanOrEqual(DICTATION_DEBRIEF_LIMITS.listItem)
    expect(cut.endsWith('...')).toBe(true)
    expect(longItem.startsWith(cut.slice(0, -3))).toBe(true)
    expect(cut.slice(0, -3).endsWith(' ')).toBe(false)
    expect(parsed.weakPatterns[0]).toBe('Short pattern.')
  })

  test('cuts long text with no spaces and drops extra list items', () => {
    const parsed = parseDictationDebriefOutput({
      ...validDebrief,
      contentSummary: 'x'.repeat(900),
      keyVocabulary: Array.from({ length: 10 }, (_, index) => ({
        example: 'e'.repeat(300),
        meaning: 'meaning',
        term: `term-${index}`,
      })),
      nextActions: ['One.', 'Two.', 'Three.', 'Four.'],
    })

    expect(parsed.contentSummary).toHaveLength(
      DICTATION_DEBRIEF_LIMITS.contentSummary
    )
    expect(parsed.keyVocabulary).toHaveLength(
      DICTATION_DEBRIEF_LIMITS.keyVocabulary
    )
    expect(parsed.keyVocabulary[0].example).toHaveLength(
      DICTATION_DEBRIEF_LIMITS.termGloss
    )
    expect(parsed.nextActions).toEqual(['One.', 'Two.', 'Three.'])
  })

  test('leaves a valid debrief unchanged and still rejects real errors', () => {
    expect(parseDictationDebriefOutput(validDebrief)).toEqual(validDebrief)
    expect(() =>
      parseDictationDebriefOutput({ ...validDebrief, nextActions: [] })
    ).toThrow()
    expect(() =>
      parseDictationDebriefOutput({ ...validDebrief, extra: 'field' })
    ).toThrow()
    expect(() => parseDictationDebriefOutput('not an object')).toThrow()
  })
})

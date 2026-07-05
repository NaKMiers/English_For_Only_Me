import { describe, expect, test } from 'vitest'

import { buildDictationSegments } from './buildSegments'
import { splitTextIntoSentences } from './text'

describe('splitTextIntoSentences', () => {
  test('keeps abbreviations and punctuation in the correct sentence', () => {
    expect(
      splitTextIntoSentences(
        'Dr. Smith arrived at 5 p.m. He checked the listening room. What happened next?'
      )
    ).toEqual([
      'Dr. Smith arrived at 5 p.m.',
      'He checked the listening room.',
      'What happened next?',
    ])
  })
})

describe('buildDictationSegments', () => {
  test('merges caption fragments across cue boundaries', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        {
          index: 0,
          startMs: 0,
          endMs: 900,
          text: 'The first thing',
        },
        {
          index: 1,
          startMs: 900,
          endMs: 1800,
          text: 'we should remember is this.',
        },
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.segments[0]).toMatchObject({
      cueIndexes: [0, 1],
      endMs: 1800,
      startMs: 0,
      text: 'The first thing we should remember is this.',
    })
  })

  test('splits untimed manual text into sentences', () => {
    const result = buildDictationSegments({
      rawCues: [],
      rawText:
        'Many IELTS speakers reduce small words. Careful dictation makes those words visible.',
    })

    expect(result.segments.map(segment => segment.text)).toEqual([
      'Many IELTS speakers reduce small words.',
      'Careful dictation makes those words visible.',
    ])
    expect(result.qualityFlags).toContain('untimed')
  })

  test('flags long, short, non-English-ish, and duplicate segments', () => {
    const result = buildDictationSegments({
      rawCues: [],
      rawText: [
        'OK.',
        '123 456 789 000.',
        'This sentence repeats for review.',
        'This sentence repeats for review.',
        'This sentence is deliberately long because it keeps adding extra clauses, extra details, and extra filler words until it becomes too heavy for one dictation prompt to be useful for focused IELTS listening practice.',
      ].join(' '),
    })

    expect(result.qualityFlags).toEqual(
      expect.arrayContaining([
        'tooShort',
        'likelyNonEnglish',
        'duplicateText',
        'tooLong',
      ])
    )
  })

  test('flags partial timing, overlapping timing, and large gaps', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        {
          index: 0,
          startMs: 0,
          endMs: 1200,
          text: 'The first timed cue',
        },
        {
          index: 1,
          startMs: 1000,
          endMs: 2000,
          text: 'overlaps and then',
        },
        {
          index: 2,
          startMs: 6000,
          endMs: 7000,
          text: 'leaves a large gap',
        },
        {
          index: 3,
          startMs: null,
          endMs: null,
          text: 'before the sentence ends.',
        },
      ],
    })

    expect(result.qualityFlags).toEqual(
      expect.arrayContaining(['partialTiming', 'overlappingTiming', 'largeGap'])
    )
    expect(result.segments[0]).toMatchObject({
      endMs: null,
      startMs: null,
    })
  })
})

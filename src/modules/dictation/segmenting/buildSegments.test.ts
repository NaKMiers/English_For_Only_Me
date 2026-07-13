import { describe, expect, test } from 'vitest'

import { buildDictationSegments } from './buildSegments'
import { splitTextIntoSentences } from './text'

interface CueInput {
  index: number
  startMs: number | null
  endMs: number | null
  text: string
}

function cue(
  index: number,
  startMs: number | null,
  endMs: number | null,
  text: string
): CueInput {
  return { index, startMs, endMs, text }
}

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

describe('buildDictationSegments (grammar-based, DailyDictation style)', () => {
  test('keeps a short sentence as a single segment', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 2000, 'As years passed and the wall grew, few returned home.')],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.segments[0]).toMatchObject({
      text: 'As years passed and the wall grew, few returned home.',
      startMs: 0,
      endMs: 2000,
    })
  })

  test('never merges across a sentence boundary', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 4000, 'Short one. Short two.')],
    })

    expect(result.segments.map(s => s.text)).toEqual(['Short one.', 'Short two.'])
  })

  test('splits one sentence spanning cues exactly like DailyDictation', () => {
    // The real Meng Jiang SRT, cues 1-3 (one sentence across three cues).
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 7128, 11256, 'According to legend, an emperor long ago declared that he would build'),
        cue(1, 11256, 14634, 'a great wall spanning thousands of kilometers'),
        cue(2, 14634, 18765, 'to protect his new empire and ensure his sustained power.'),
      ],
    })

    expect(result.segments.map(s => s.text)).toEqual([
      'According to legend, an emperor long ago declared that he would build a great wall',
      'spanning thousands of kilometers to protect his new empire and ensure his sustained power.',
    ])
    // Segment 1 crosses cues 0 and 1; segment 2 crosses cues 1 and 2.
    expect(result.segments[0].cueIndexes).toEqual([0, 1])
    expect(result.segments[1].cueIndexes).toEqual([1, 2])
    // Outer timing stays exact at the real cue boundaries; the mid-cue cut is
    // interpolated and continuous between the two segments.
    expect(result.segments[0].startMs).toBe(7128)
    expect(result.segments[1].endMs).toBe(18765)
    expect(result.segments[0].endMs).toBe(result.segments[1].startMs)
    expect(result.segments[0].endMs).toBeGreaterThan(11256)
    expect(result.segments[0].endMs).toBeLessThan(14634)
  })

  test('splits a long sentence at a comma clause boundary', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 6000, "One particular gourd crossed the fence and extended into the Jiang's yard, so they cared for it."),
      ],
    })

    expect(result.segments.map(s => s.text)).toEqual([
      "One particular gourd crossed the fence and extended into the Jiang's yard,",
      'so they cared for it.',
    ])
  })

  test('splits a long sentence at a coordinating conjunction when there is no comma', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 6000, 'He ordered many men across China to leave their homes and submit to the grueling labor required for its construction.'),
      ],
    })

    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].text).toBe(
      'He ordered many men across China to leave their homes'
    )
    expect(result.segments[1].text).toBe(
      'and submit to the grueling labor required for its construction.'
    )
  })

  test('does not flag missingPunctuation on a clause-cut chunk', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 6000, "One particular gourd crossed the fence and extended into the Jiang's yard, so they cared for it."),
      ],
    })

    expect(result.segments[0].text).toMatch(/,$/)
    expect(result.segments[0].qualityFlags).not.toContain('missingPunctuation')
  })

  test('interpolates a mid-cue cut and stays within the cue window', () => {
    // 16 plain words, one cue 0-16000ms, no commas -> split near the middle.
    const words = Array.from({ length: 16 }, (_, i) => `w${i}`).join(' ')
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 16000, `${words}.`)],
    })

    expect(result.segments.length).toBeGreaterThanOrEqual(2)
    expect(result.segments[0].startMs).toBe(0)
    expect(result.segments.at(-1)!.endMs).toBe(16000)
    expect(result.segments[0].endMs).toBeGreaterThan(0)
    expect(result.segments[0].endMs).toBeLessThan(16000)
    // Contiguous: one segment's end is the next segment's start.
    expect(result.segments[0].endMs).toBe(result.segments[1].startMs)
    result.segments.forEach(segment =>
      expect(segment.text.split(' ').length).toBeLessThanOrEqual(15)
    )
  })

  test('splits untimed manual text into sentences with null timing', () => {
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
    expect(result.segments[0]).toMatchObject({ startMs: null, endMs: null })
  })

  test('flags partialTiming and drops exact timing when a cue is untimed', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 1500, 'the timed part and'),
        cue(1, null, null, 'the untimed part here'),
      ],
    })

    // Same sentence, one untimed cue -> merged chunk loses exact timing.
    expect(result.qualityFlags).toContain('partialTiming')
    expect(result.segments[0]).toMatchObject({ startMs: null, endMs: null })
  })

  test('flags short, non-English-ish, duplicate, and long segments', () => {
    const result = buildDictationSegments({
      rawCues: [],
      rawText: [
        'OK.',
        '123 456 789 000.',
        'This sentence repeats for review.',
        'This sentence repeats for review.',
      ].join(' '),
    })

    expect(result.qualityFlags).toEqual(
      expect.arrayContaining(['tooShort', 'likelyNonEnglish', 'duplicateText'])
    )
  })
})

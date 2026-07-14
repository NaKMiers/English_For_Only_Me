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

  test('splits a sentence spanning cues only at its one comma pause', () => {
    // The real Meng Jiang SRT, cues 1-3 (one sentence across three cues). The
    // only internal pause is the comma after "legend", so that is the only cut:
    // the long tail stays intact rather than being chopped mid-phrase.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 7128, 11256, 'According to legend, an emperor long ago declared that he would build'),
        cue(1, 11256, 14634, 'a great wall spanning thousands of kilometers'),
        cue(2, 14634, 18765, 'to protect his new empire and ensure his sustained power.'),
      ],
    })

    expect(result.segments.map(s => s.text)).toEqual([
      'According to legend,',
      'an emperor long ago declared that he would build a great wall spanning thousands of kilometers to protect his new empire and ensure his sustained power.',
    ])
    // Segment 1 sits inside cue 0; segment 2 crosses all three cues.
    expect(result.segments[0].cueIndexes).toEqual([0])
    expect(result.segments[1].cueIndexes).toEqual([0, 1, 2])
    // Outer timing stays exact at the real cue boundaries; the mid-cue cut is
    // interpolated and continuous between the two segments.
    expect(result.segments[0].startMs).toBe(7128)
    expect(result.segments[1].endMs).toBe(18765)
    expect(result.segments[0].endMs).toBe(result.segments[1].startMs)
    expect(result.segments[0].endMs).toBeGreaterThan(7128)
    expect(result.segments[0].endMs).toBeLessThan(11256)
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

  test('keeps a long sentence whole when it has no comma or pause', () => {
    // No pause punctuation and no silence gap -> integrity wins over brevity,
    // so we never chop mid-phrase (e.g. at "homes and") the way we used to.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 6000, 'He ordered many men across China to leave their homes and submit to the grueling labor required for its construction.'),
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].text).toBe(
      'He ordered many men across China to leave their homes and submit to the grueling labor required for its construction.'
    )
  })

  test('splits a long sentence at a dash rather than mid-clause', () => {
    // Regression: previously cut at "produce | a compound" (no pause there);
    // the only real pause is the dash after "ethanol", so that is where it cuts.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 8000, 'As the yeasts feed on the fruit sugars they produce a compound called ethanol— the type of alcohol in alcoholic beverages.'),
      ],
    })

    expect(result.segments.map(s => s.text)).toEqual([
      'As the yeasts feed on the fruit sugars they produce a compound called ethanol—',
      'the type of alcohol in alcoholic beverages.',
    ])
  })

  test('force-splits a degenerate pause-less run so segments stay storable', () => {
    // A broken transcript: 200 words, no punctuation, contiguous timing (no
    // gap). There is no natural pause, but keeping it whole would exceed the
    // stored-text limit, so the safety valve chops it into usable chunks.
    const words = Array.from({ length: 200 }, (_, i) => `word${i}`).join(' ')
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 200000, words)],
    })

    expect(result.segments.length).toBeGreaterThan(1)
    result.segments.forEach(segment => {
      expect(segment.text.split(' ').length).toBeLessThanOrEqual(15)
      expect(segment.text.length).toBeLessThanOrEqual(3000)
      expect(segment.normalizedText.length).toBeLessThanOrEqual(3000)
    })
    // Contiguous coverage: the pieces reassemble into the original stream.
    expect(result.segments.map(s => s.text).join(' ')).toBe(words)
  })

  test('keeps a long pause-less sentence whole when under the hard limit', () => {
    // 40 words, no punctuation, no gap -> under the safety valve, so integrity
    // wins and it stays a single segment.
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ')
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 40000, `${words}.`)],
    })

    expect(result.segments).toHaveLength(1)
  })

  test('splits at a real silence gap when there is no punctuation', () => {
    // Two contiguous-text cues, but a 500ms silence between them is a natural
    // pause the speaker takes, so it is a valid cut even without punctuation.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 3000, 'the wall stretched far across the northern frontier of the land'),
        cue(1, 3500, 6000, 'guarding the empire against every invader from the cold steppes'),
      ],
    })

    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].text).toBe(
      'the wall stretched far across the northern frontier of the land'
    )
    expect(result.segments[1].text).toBe(
      'guarding the empire against every invader from the cold steppes'
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
    // 16 plain words in one cue 0-16000ms with a comma after the 8th -> split
    // at the comma, which lands mid-cue, so the cut time is interpolated.
    const first = Array.from({ length: 8 }, (_, i) => `w${i}`).join(' ')
    const second = Array.from({ length: 8 }, (_, i) => `w${i + 8}`).join(' ')
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 16000, `${first}, ${second}.`)],
    })

    expect(result.segments).toHaveLength(2)
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

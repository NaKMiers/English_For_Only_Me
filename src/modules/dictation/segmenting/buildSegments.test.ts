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

interface CueInput {
  index: number
  startMs: number | null
  endMs: number | null
  text: string
}

// Tiny fixture helper so the timing/word math in each test reads clearly.
function cue(
  index: number,
  startMs: number | null,
  endMs: number | null,
  text: string
): CueInput {
  return { index, startMs, endMs, text }
}

describe('buildDictationSegments (pause-based grouping)', () => {
  test('merges consecutive cues when there is no pause between them', () => {
    // gap = 900 - 900 = 0ms (< PAUSE_GAP_MS), so the two cues stay one segment.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 900, 'The first thing'),
        cue(1, 900, 1800, 'we should remember is this.'),
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

  test('splits at a pause once the group meets the minimum', () => {
    // gap before cue 1 = 2000 - 1500 = 500ms (>= PAUSE_GAP_MS) and cue 0 has
    // 5 words (>= MIN_SEGMENT_WORDS), so it cuts between the two cues.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 1500, 'the first idea here matters'),
        cue(1, 2000, 3500, 'and the second idea follows'),
      ],
    })

    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].cueIndexes).toEqual([0])
    expect(result.segments[1].cueIndexes).toEqual([1])
  })

  test('does NOT split at a pause when the group is still tiny (merges forward)', () => {
    // A 1-word 400ms cue then a 600ms pause: below MIN, so it must NOT split -
    // the stray word merges into the next chunk instead of becoming a fragment.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 400, 'hi'),
        cue(1, 1000, 3000, 'now the real sentence begins here'),
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].cueIndexes).toEqual([0, 1])
  })

  test('force-cuts a run-on with no pause at the duration cap', () => {
    // 8 continuous 2500ms cues (no gaps, few words). The MS cap (9000) forces a
    // cut after the 4th cue (10000ms), so the 30s-run-on problem is bounded.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: Array.from({ length: 8 }, (_, i) =>
        cue(i, i * 2500, (i + 1) * 2500, 'keep talking')
      ),
    })

    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].cueIndexes).toEqual([0, 1, 2, 3])
    expect(result.segments[1].cueIndexes).toEqual([4, 5, 6, 7])
  })

  test('force-cuts at the word cap when speech is dense with no pause', () => {
    // 6 continuous 5-word cues, short durations so MS cap never triggers first.
    // Word cap (14) closes after the 3rd cue (15 words).
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 400, 'one two three four five'),
        cue(1, 400, 800, 'six seven eight nine ten'),
        cue(2, 800, 1200, 'eleven twelve thirteen fourteen fifteen'),
        cue(3, 1200, 1600, 'apple banana cherry date fig'),
        cue(4, 1600, 2000, 'grape kiwi lemon mango olive'),
        cue(5, 2000, 2400, 'peach plum quince rose sage'),
      ],
    })

    expect(result.segments).toHaveLength(2)
    expect(result.segments[0].cueIndexes).toEqual([0, 1, 2])
    expect(result.segments[1].cueIndexes).toEqual([3, 4, 5])
  })

  test('falls back to the word cap for untimed cues without crashing', () => {
    // No timings at all: pause + duration logic is inert, only the word cap
    // splits, and every segment is flagged untimed.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: Array.from({ length: 4 }, (_, i) =>
        cue(i, null, null, 'alpha beta gamma delta epsilon')
      ),
    })

    expect(result.segments.length).toBeGreaterThanOrEqual(2)
    expect(result.qualityFlags).toContain('untimed')
    expect(result.segments[0]).toMatchObject({ startMs: null, endMs: null })
  })

  test('merges overlapping timed cues and flags overlappingTiming', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 1000, 'first part here now'),
        cue(1, 800, 1800, 'second part overlaps'),
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.qualityFlags).toContain('overlappingTiming')
  })

  test('flags partialTiming when a timed and an untimed cue share a segment', () => {
    // gap is null (untimed cue), so no pause split; they merge and the segment
    // loses exact timing.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 1000, 'the timed part'),
        cue(1, null, null, 'and the untimed part here'),
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.qualityFlags).toContain('partialTiming')
    expect(result.segments[0]).toMatchObject({ startMs: null, endMs: null })
  })

  test('flags largeGap when a below-min group spans a long silence', () => {
    // Stray 1-word cue then a 4500ms gap: below MIN so it cannot pause-split,
    // the group swallows the gap and gets the largeGap warning instead.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [
        cue(0, 0, 500, 'well'),
        cue(1, 5000, 7000, 'the answer finally comes'),
      ],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.qualityFlags).toContain('largeGap')
  })

  test('keeps a single short cue as its own segment (never dropped)', () => {
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 800, 'just this')],
    })

    expect(result.segments).toHaveLength(1)
    expect(result.segments[0].cueIndexes).toEqual([0])
  })

  test('does not flag missingPunctuation on pause-cut cue segments', () => {
    // A cue that ends mid-sentence (no period) must not be warned - that is the
    // normal shape of a pause-based segment.
    const result = buildDictationSegments({
      rawText: '',
      rawCues: [cue(0, 0, 1500, 'this line ends without a period')],
    })

    expect(result.qualityFlags).not.toContain('missingPunctuation')
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

})

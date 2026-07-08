import { describe, expect, test } from 'vitest'

import { resolveCaptionForWindow, type CaptionCue } from './captionOverlap'

const cues: CaptionCue[] = [
  { text: 'First line.', startMs: 0, endMs: 1000 },
  { text: 'Second line.', startMs: 1000, endMs: 2000 },
  { text: 'Third line.', startMs: 2000, endMs: 3000 },
]

describe('resolveCaptionForWindow', () => {
  test('returns the cue overlapping the window', () => {
    expect(resolveCaptionForWindow(cues, 1000, 2000)).toBe('Second line.')
  })

  test('joins multiple overlapping cues in time order', () => {
    expect(resolveCaptionForWindow(cues, 500, 2500)).toBe(
      'First line. Second line. Third line.'
    )
  })

  test('treats boundaries as half-open (no touch-only overlap)', () => {
    // A window that exactly meets the first cue's end but starts the second.
    expect(resolveCaptionForWindow(cues, 1000, 1500)).toBe('Second line.')
  })

  test('returns empty string for an untimed window', () => {
    expect(resolveCaptionForWindow(cues, null, null)).toBe('')
    expect(resolveCaptionForWindow(cues, 500, null)).toBe('')
  })

  test('returns empty string when nothing overlaps', () => {
    expect(resolveCaptionForWindow(cues, 5000, 6000)).toBe('')
  })

  test('collapses duplicate caption lines across adjacent cues', () => {
    const dupes: CaptionCue[] = [
      { text: 'Same.', startMs: 0, endMs: 1000 },
      { text: 'Same.', startMs: 1000, endMs: 2000 },
    ]

    expect(resolveCaptionForWindow(dupes, 0, 2000)).toBe('Same.')
  })

  test('ignores cues with missing timing', () => {
    const mixed: CaptionCue[] = [
      { text: 'Untimed.', startMs: null, endMs: null },
      { text: 'Timed.', startMs: 0, endMs: 1000 },
    ]

    expect(resolveCaptionForWindow(mixed, 0, 1000)).toBe('Timed.')
  })
})

import { describe, expect, test } from 'vitest'

import { formatCuesAsCaptionText } from './formatCuesAsCaptionText'
import { normalizeTranscriptSource } from './normalizeTranscriptSource'

describe('formatCuesAsCaptionText', () => {
  test('reconstructs numbered SRT blocks from cues', () => {
    const result = formatCuesAsCaptionText([
      { index: 0, text: 'First line.', startMs: 1000, endMs: 2000 },
      { index: 1, text: 'Second line.', startMs: 2500, endMs: 4000 },
    ])

    expect(result).toBe(
      '1\n00:00:01,000 --> 00:00:02,000\nFirst line.\n\n2\n00:00:02,500 --> 00:00:04,000\nSecond line.'
    )
  })

  test('round-trips through normalizeTranscriptSource back to the same cue timings', () => {
    const original = `1
00:00:01,439 --> 00:00:06,240
There are Kaijus with biological armour.

2
00:00:06,240 --> 00:00:11,120
and eat their victims alive.`

    const parsed = normalizeTranscriptSource({ rawText: original })
    const reconstructed = formatCuesAsCaptionText(parsed.rawCues)
    const reparsed = normalizeTranscriptSource({ rawText: reconstructed })

    expect(reparsed.rawCues).toEqual(parsed.rawCues)
  })
})

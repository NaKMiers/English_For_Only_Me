import { describe, expect, test } from 'vitest'

import type { CaptionCue } from './captionOverlap'
import { resolveSegmentTranslation } from './segmentTranslation'

const cues: CaptionCue[] = [
  { startMs: 1000, endMs: 3000, text: 'Caption line.' },
]

describe('resolveSegmentTranslation', () => {
  test('uses the manual override when set for the language', () => {
    expect(
      resolveSegmentTranslation({
        cues,
        language: 'vi',
        segment: {
          startMs: 1000,
          endMs: 3000,
          translations: { vi: 'Bản dịch tùy chỉnh' },
        },
      })
    ).toBe('Bản dịch tùy chỉnh')
  })

  test('falls back to the overlapped caption when there is no override', () => {
    expect(
      resolveSegmentTranslation({
        cues,
        language: 'vi',
        segment: { startMs: 1000, endMs: 3000, translations: {} },
      })
    ).toBe('Caption line.')
  })

  test('falls back when the override for that language is blank', () => {
    expect(
      resolveSegmentTranslation({
        cues,
        language: 'vi',
        segment: {
          startMs: 1000,
          endMs: 3000,
          translations: { vi: '   ', fr: 'Autre' },
        },
      })
    ).toBe('Caption line.')
  })
})

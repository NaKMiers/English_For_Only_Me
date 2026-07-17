import { describe, expect, test } from 'vitest'

import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from './statusDisplay'

describe('dictation status display helpers', () => {
  test('formats internal dictation statuses as reader-friendly labels', () => {
    expect(getDictationStatusLabel('ready')).toBe('Ready')
    expect(getDictationStatusLabel('transcriptReady')).toBe('Transcript Ready')
    expect(getDictationStatusLabel('metadataReady')).toBe('Metadata Ready')
  })

  test('uses distinct tones for video statuses', () => {
    expect(getDictationStatusTone('ready')).toBe('yellow')
    expect(getDictationStatusTone('transcriptReady')).toBe('pale')
    expect(getDictationStatusTone('archived')).toBe('pale')
    expect(getDictationStatusTone('failed')).toBe('red')
  })
})

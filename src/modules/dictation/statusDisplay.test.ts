import { describe, expect, test } from 'vitest'

import {
  getDictationStatusLabel,
  getDictationStatusTone,
} from './statusDisplay'

describe('dictation status display helpers', () => {
  test('formats internal dictation statuses as reader-friendly labels', () => {
    expect(getDictationStatusLabel('inProgress')).toBe('In Progress')
    expect(getDictationStatusLabel('transcriptReady')).toBe('Transcript Ready')
    expect(getDictationStatusLabel('metadataReady')).toBe('Metadata Ready')
  })

  test('uses distinct tones for active video statuses', () => {
    expect(getDictationStatusTone('inProgress')).toBe('sky')
    expect(getDictationStatusTone('ready')).toBe('yellow')
    expect(getDictationStatusTone('transcriptReady')).toBe('pale')
    expect(getDictationStatusTone('completed')).toBe('ink')
  })
})

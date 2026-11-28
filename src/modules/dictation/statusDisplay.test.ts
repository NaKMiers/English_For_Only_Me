import { describe, expect, test } from 'vitest'

import { getDictationStatusTone } from './statusDisplay'

describe('dictation status display helpers', () => {
  test('uses distinct tones for video statuses', () => {
    expect(getDictationStatusTone('ready')).toBe('yellow')
    expect(getDictationStatusTone('transcriptReady')).toBe('pale')
    expect(getDictationStatusTone('archived')).toBe('pale')
    expect(getDictationStatusTone('failed')).toBe('red')
  })
})

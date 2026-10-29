import { describe, expect, it } from 'vitest'

import { restoredVideoStatus } from './videoTrash'

describe('restoredVideoStatus', () => {
  it('makes a video with segments ready again', () => {
    expect(
      restoredVideoStatus({ activeTranscriptId: 't1', sentenceCount: 12 })
    ).toBe('ready')
  })

  it('keeps a transcript without segments at transcriptReady', () => {
    expect(
      restoredVideoStatus({ activeTranscriptId: 't1', sentenceCount: 0 })
    ).toBe('transcriptReady')
  })

  it('sends a video with no transcript back to needsTranscript', () => {
    expect(
      restoredVideoStatus({ activeTranscriptId: null, sentenceCount: 0 })
    ).toBe('needsTranscript')
  })
})

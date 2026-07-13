import { describe, expect, test } from 'vitest'

import {
  getReimportedVideoStatus,
  parseYouTubeImportRequest,
} from './youtubeImportDecisions'

describe('getReimportedVideoStatus', () => {
  test('restores archived videos when they are imported again', () => {
    expect(getReimportedVideoStatus('archived')).toBe('needsTranscript')
  })

  test('keeps active library videos in their current state', () => {
    expect(getReimportedVideoStatus('ready')).toBe('ready')
  })

  test('defaults new imports to needing captions', () => {
    expect(getReimportedVideoStatus(undefined)).toBe('needsTranscript')
  })
})

describe('parseYouTubeImportRequest', () => {
  test('rejects non-YouTube URLs before database work', () => {
    expect(
      parseYouTubeImportRequest({
        youtubeUrl: 'https://example.com/watch?v=dQw4w9WgXcQ',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('returns normalized video identity for supported YouTube URLs', () => {
    expect(
      parseYouTubeImportRequest({
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
      })
    ).toEqual({
      ok: true,
      data: {
        youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
        normalizedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoId: 'dQw4w9WgXcQ',
      },
    })
  })
})

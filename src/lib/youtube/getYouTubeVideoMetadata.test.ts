import { afterEach, describe, expect, test } from 'vitest'

import { ENV_KEYS } from '@/constants/environments'

import {
  getYouTubeVideoMetadata,
  mapYouTubeVideosListResponse,
  parseIso8601DurationSeconds,
} from './getYouTubeVideoMetadata'

const originalEnv = {
  youtubeApiKey: process.env[ENV_KEYS.youtubeApiKey],
}

afterEach(() => {
  if (originalEnv.youtubeApiKey === undefined)
    delete process.env[ENV_KEYS.youtubeApiKey]
  else process.env[ENV_KEYS.youtubeApiKey] = originalEnv.youtubeApiKey
})

describe('getYouTubeVideoMetadata', () => {
  test('maps ISO 8601 durations to seconds', () => {
    expect(parseIso8601DurationSeconds('PT1H2M3S')).toBe(3723)
    expect(parseIso8601DurationSeconds('PT45S')).toBe(45)
    expect(parseIso8601DurationSeconds('P1DT2H')).toBe(93600)
  })

  test('returns an API-key-missing state without fetching', async () => {
    delete process.env[ENV_KEYS.youtubeApiKey]

    const result = await getYouTubeVideoMetadata('dQw4w9WgXcQ', async () => {
      throw new Error('fetch should not run')
    })

    expect(result).toMatchObject({
      state: 'apiKeyMissing',
    })
  })

  test('maps official API success response', async () => {
    process.env[ENV_KEYS.youtubeApiKey] = 'test-key'

    const result = await getYouTubeVideoMetadata('dQw4w9WgXcQ', async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            snippet: {
              title: 'IELTS listening sample',
              channelTitle: 'Study Channel',
              defaultAudioLanguage: 'en',
              thumbnails: {
                high: {
                  url: 'https://img.youtube.com/high.jpg',
                },
              },
            },
            contentDetails: {
              duration: 'PT3M5S',
            },
            status: {
              embeddable: true,
            },
          },
        ],
      }),
    }))

    expect(result).toEqual({
      state: 'ready',
      metadata: {
        title: 'IELTS listening sample',
        channelTitle: 'Study Channel',
        durationSeconds: 185,
        thumbnailUrl: 'https://img.youtube.com/high.jpg',
        defaultLanguage: 'en',
        embeddable: true,
      },
      warning: null,
    })
  })

  test('maps missing or unavailable videos', () => {
    expect(mapYouTubeVideosListResponse({ items: [] })).toEqual({
      state: 'notFound',
      message: 'This YouTube video was not found or is unavailable.',
    })
  })

  test('reports non-embeddable videos as a warning', () => {
    const result = mapYouTubeVideosListResponse({
      items: [
        {
          snippet: {
            title: 'Private embed setting',
          },
          contentDetails: {
            duration: 'PT1M',
          },
          status: {
            embeddable: false,
          },
        },
      ],
    })

    expect(result).toMatchObject({
      state: 'ready',
      warning:
        'YouTube says this video is not embeddable. It can be saved, but practice replay may need a fallback.',
    })
  })
})

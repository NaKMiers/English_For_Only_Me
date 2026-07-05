import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  getDictationGlobalStatsApi,
  getDictationVideoStatsApi,
} from './dictationStatsApi'

const originalFetch = globalThis.fetch

afterEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: originalFetch,
  })
})

function mockFetch(fetchMock: typeof fetch) {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    value: fetchMock,
  })
}

describe('dictation stats request helpers', () => {
  test('surfaces API error messages', async () => {
    mockFetch(
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'No stats.' }), {
            status: 500,
          })
      )
    )

    await expect(getDictationGlobalStatsApi()).rejects.toThrow('No stats.')
  })

  test('requests per-video stats with cache disabled', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            stats: {
              commonMissedWords: [],
              completedSegmentCount: 0,
              completionPercentage: 0,
              firstTryWordAccuracy: 0,
              hardestSegments: [],
              mistakeTaxonomy: {
                extra: 0,
                missing: 0,
                spellingVariant: 0,
                wrong: 0,
              },
              overallWordAccuracy: 0,
              revealCount: 0,
              retryCount: 0,
              replayCount: 0,
              segmentCount: 0,
              skipCount: 0,
              timeSpentMs: 0,
            },
          })
        )
    )

    mockFetch(fetchMock)

    await getDictationVideoStatsApi({
      videoId: 'video one',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/dictation/stats?videoId=video%20one',
      {
        cache: 'no-store',
      }
    )
  })
})

import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  getDueVocabRecallApi,
  recordVocabOccurrenceApi,
  searchVocabApi,
} from './vocabularyApi'

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

describe('vocabulary request helpers', () => {
  test('surfaces API error messages', async () => {
    mockFetch(
      vi.fn(
        async () =>
          new Response(JSON.stringify({ message: 'Bad vocab.' }), {
            status: 400,
          })
      )
    )

    await expect(searchVocabApi({ query: 'bad' })).rejects.toThrow('Bad vocab.')
  })

  test('requests due recall tasks with listening exclusion', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            tasks: [],
          })
        )
    )

    mockFetch(fetchMock)

    await getDueVocabRecallApi({
      excludeListening: true,
      limit: 12,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vocab/recall/due?limit=12&excludeListening=1',
      { cache: 'no-store' }
    )
  })

  test('passes the due page cursor through', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ nextCursor: null, tasks: [] }))
    )

    mockFetch(fetchMock)

    await getDueVocabRecallApi({ cursor: 'v1.1.2.3.abc', limit: 20 })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vocab/recall/due?limit=20&cursor=v1.1.2.3.abc',
      { cache: 'no-store' }
    )
  })

  test('records a cached-lookup occurrence with keepalive and safe ids', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: 1 })))

    mockFetch(fetchMock)

    await recordVocabOccurrenceApi({
      occurrence: {
        reason: 'clickedInAnswer',
        segmentId: 'not-an-object-id',
        selectedText: 'expect',
      },
      vocabEntryId: '507f1f77bcf86cd799439011',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/vocab/occurrences', {
      body: JSON.stringify({
        occurrence: {
          reason: 'clickedInAnswer',
          selectedText: 'expect',
        },
        vocabEntryId: '507f1f77bcf86cd799439011',
      }),
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      method: 'POST',
    })
  })
})

import { afterEach, describe, expect, test, vi } from 'vitest'

import { searchVocabApi, setVocabItemStatusApi } from './vocabularyApi'

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

  test('posts item status changes with cache disabled', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            item: {
              id: 'item',
              userId: 'user',
              vocabEntryId: 'entry',
              status: 'learning',
            },
          })
        )
    )

    mockFetch(fetchMock)

    await setVocabItemStatusApi({
      source: 'search',
      status: 'shouldLearn',
      vocabEntryId: 'entry',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/vocab/items', {
      body: JSON.stringify({
        source: 'search',
        status: 'shouldLearn',
        vocabEntryId: 'entry',
      }),
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
  })
})

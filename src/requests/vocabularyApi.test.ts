import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  answerVocabRecallApi,
  getDueVocabRecallApi,
  searchVocabApi,
  setVocabItemStatusApi,
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

  test('posts signed recall answers without client-graded correctness', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            attemptId: 'attempt',
            isCorrect: true,
            item: {
              id: 'item',
              status: 'learning',
            },
          })
        )
    )

    mockFetch(fetchMock)

    await answerVocabRecallApi({
      idempotencyKey: 'idem-key-123',
      selectedOptionId: 'word:entry',
      token: 'signed-token',
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/vocab/recall/answer', {
      body: JSON.stringify({
        action: undefined,
        idempotencyKey: 'idem-key-123',
        selectedOptionId: 'word:entry',
        token: 'signed-token',
      }),
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    })
  })
})

import { afterEach, describe, expect, test, vi } from 'vitest'

import { translateSegmentTextWithProvider } from './translationProviderCore'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('translateSegmentTextWithProvider', () => {
  test('returns unavailable when the provider key is missing', async () => {
    const result = await translateSegmentTextWithProvider({
      apiKey: null,
      model: 'gpt-5.4-nano',
      segmentText: 'Keep practicing.',
      targetLanguage: 'vi',
    })

    expect(result).toEqual({
      provider: 'none',
      status: 'failed',
      text: '',
      unavailableReason: 'Translation provider is not configured.',
    })
  })

  test('returns unavailable when the provider request fails', async () => {
    const result = await translateSegmentTextWithProvider({
      apiKey: 'test-key',
      fetcher: vi.fn(async () => {
        throw new Error('network down')
      }),
      model: 'gpt-5.4-nano',
      segmentText: 'Keep practicing.',
      targetLanguage: 'vi',
    })

    expect(result.provider).toBe('none')
    expect(result.status).toBe('failed')
    expect(result.text).toBe('')
    expect(result.unavailableReason).toBe(
      'Translation provider is unavailable.'
    )
  })
})

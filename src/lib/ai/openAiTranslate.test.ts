import { afterEach, describe, expect, test, vi } from 'vitest'

import { translateSegmentText } from './openAiTranslate'

const ORIGINAL_KEY = process.env.OPENAI_API_KEY

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = ORIGINAL_KEY
})

function fakeFetch(translation: string): typeof fetch {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({ translation }),
          status: 'completed',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
  ) as unknown as typeof fetch
}

describe('translateSegmentText', () => {
  test('returns the parsed translation', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'

    const result = await translateSegmentText({
      fetcher: fakeFetch('Xin chào'),
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result).toEqual({ ok: true, translation: 'Xin chào' })
  })

  test('fails when the provider is not configured', async () => {
    delete process.env.OPENAI_API_KEY

    const result = await translateSegmentText({
      fetcher: fakeFetch('x'),
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result.ok).toBe(false)
  })

  test('fails when the translation comes back empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test'

    const result = await translateSegmentText({
      fetcher: fakeFetch('   '),
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result.ok).toBe(false)
  })
})

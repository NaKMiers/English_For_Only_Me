import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { translateSegmentText } from './qwenTranslate'

const ENV_NAMES = [
  'DASHSCOPE_API_KEY',
  'DASHSCOPE_HOST',
  'QWEN_TRANSLATION_MODEL',
] as const
const originalEnv = Object.fromEntries(
  ENV_NAMES.map(name => [name, process.env[name]])
)

beforeEach(() => {
  for (const name of ENV_NAMES) delete process.env[name]
})

afterEach(() => {
  for (const name of ENV_NAMES)
    if (originalEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalEnv[name]
})

function fakeFetch(translation: string) {
  return vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          output_text: JSON.stringify({ translation }),
          status: 'completed',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
  )
}

describe('translateSegmentText', () => {
  test('returns the parsed translation', async () => {
    process.env.DASHSCOPE_API_KEY = 'sk-test'

    const result = await translateSegmentText({
      fetcher: fakeFetch('Xin chào'),
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result).toEqual({ ok: true, translation: 'Xin chào' })
  })

  test('sends the key and model to Qwen with thinking off', async () => {
    process.env.DASHSCOPE_API_KEY = 'qwen-test'
    process.env.QWEN_TRANSLATION_MODEL = 'qwen3.8-flash'
    const fetcher = fakeFetch('Xin chào')

    const result = await translateSegmentText({
      fetcher,
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })
    const [url, init] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    const body = JSON.parse(String(init.body)) as Record<string, unknown>

    expect(result).toEqual({ ok: true, translation: 'Xin chào' })
    expect(url).toBe(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/responses'
    )
    expect(init.headers).toMatchObject({ Authorization: 'Bearer qwen-test' })
    expect(body.model).toBe('qwen3.8-flash')
    expect(body.enable_thinking).toBe(false)
    expect(body.store).toBe(false)
  })

  test('fails without a request when the key is missing', async () => {
    const fetcher = fakeFetch('x')

    const result = await translateSegmentText({
      fetcher,
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result.ok).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('fails when the translation comes back empty', async () => {
    process.env.DASHSCOPE_API_KEY = 'sk-test'

    const result = await translateSegmentText({
      fetcher: fakeFetch('   '),
      languageLabel: 'Vietnamese',
      text: 'Hello',
    })

    expect(result.ok).toBe(false)
  })
})

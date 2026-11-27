import { afterEach, describe, expect, test, vi } from 'vitest'

import { requestQwenStructuredOutput } from './qwenClientCore'

const ORIGINAL_HOST = process.env.DASHSCOPE_HOST

afterEach(() => {
  if (ORIGINAL_HOST === undefined) delete process.env.DASHSCOPE_HOST
  else process.env.DASHSCOPE_HOST = ORIGINAL_HOST
})

const BASE_REQUEST = {
  input: [
    {
      content: 'Build debrief.',
      role: 'user' as const,
    },
  ],
  model: 'qwen3.8-flash',
  schema: {
    type: 'object',
  },
  schemaName: 'test_schema',
}

function okFetch() {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          output: [{ content: [{ text: '{"a":1}', type: 'output_text' }] }],
          status: 'completed',
          usage: { input_tokens: 12, output_tokens: 3 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
  )
}

function sentRequest(fetcher: ReturnType<typeof okFetch>) {
  const [url, init] = fetcher.mock.calls[0]

  return {
    body: JSON.parse(String(init?.body)) as Record<string, unknown>,
    headers: init?.headers as Record<string, string>,
    url: String(url),
  }
}

describe('requestQwenStructuredOutput', () => {
  test('returns a provider failure when the API key is missing', async () => {
    const fetcher = okFetch()
    const result = await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: null,
      fetcher,
    })

    expect(result).toEqual({
      ok: false,
      message: 'AI provider is not configured.',
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  test('returns a provider failure when fetch fails', async () => {
    const result = await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'test-key',
      fetcher: vi.fn(async () => {
        throw new Error('network down')
      }),
    })

    expect(result).toEqual({
      ok: false,
      message: 'AI provider is unavailable.',
    })
  })

  test('turns thinking off when no effort is set', async () => {
    delete process.env.DASHSCOPE_HOST
    const fetcher = okFetch()

    const result = await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      fetcher,
    })
    const { body, headers, url } = sentRequest(fetcher)

    expect(url).toBe(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/responses'
    )
    expect(headers.Authorization).toBe('Bearer qwen-key')
    expect(body.enable_thinking).toBe(false)
    expect(body).not.toHaveProperty('reasoning')
    expect(body.store).toBe(false)
    expect(body.text).toEqual({
      format: {
        name: 'test_schema',
        schema: { type: 'object' },
        strict: true,
        type: 'json_schema',
      },
    })
    expect(result).toMatchObject({
      ok: true,
      text: '{"a":1}',
      usage: { inputTokens: 12, outputTokens: 3 },
    })
  })

  test('keeps thinking at the given effort', async () => {
    const fetcher = okFetch()

    await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      fetcher,
      model: 'qwen3.8-max',
      reasoningEffort: 'low',
    })
    const { body } = sentRequest(fetcher)

    expect(body.reasoning).toEqual({ effort: 'low' })
    expect(body).not.toHaveProperty('enable_thinking')
    expect(body.store).toBe(false)
  })

  test('uses DASHSCOPE_HOST and an explicit base URL', async () => {
    process.env.DASHSCOPE_HOST = 'https://ws.example.test/'
    const fromEnv = okFetch()
    const explicit = okFetch()

    await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      fetcher: fromEnv,
    })
    await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      baseUrl: 'https://other.example.test/v1',
      fetcher: explicit,
    })

    expect(sentRequest(fromEnv).url).toBe(
      'https://ws.example.test/compatible-mode/v1/responses'
    )
    expect(sentRequest(explicit).url).toBe(
      'https://other.example.test/v1/responses'
    )
  })

  test('passes the provider error message through', async () => {
    const result = await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      fetcher: vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: { message: 'Model not authorized' } }),
            { status: 403 }
          )
      ),
    })

    expect(result).toEqual({ ok: false, message: 'Model not authorized' })
  })

  test('names the reason and ceiling of an incomplete response', async () => {
    const result = await requestQwenStructuredOutput({
      ...BASE_REQUEST,
      apiKey: 'qwen-key',
      fetcher: vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              incomplete_details: { reason: 'max_output_tokens' },
              status: 'incomplete',
            }),
            { status: 200 }
          )
      ),
      maxOutputTokens: 500,
    })

    expect(result).toEqual({
      ok: false,
      message:
        'AI provider response was incomplete (max_output_tokens), max_output_tokens=500.',
    })
  })
})

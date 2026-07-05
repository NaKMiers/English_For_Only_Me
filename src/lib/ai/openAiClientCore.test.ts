import { describe, expect, test, vi } from 'vitest'

import { requestOpenAiStructuredOutput } from './openAiClientCore'

describe('requestOpenAiStructuredOutput', () => {
  test('returns a provider failure when the API key is missing', async () => {
    const result = await requestOpenAiStructuredOutput({
      apiKey: null,
      input: [
        {
          content: 'Build debrief.',
          role: 'user',
        },
      ],
      model: 'gpt-4o-mini',
      schema: {
        type: 'object',
      },
      schemaName: 'test_schema',
    })

    expect(result).toEqual({
      ok: false,
      message: 'OpenAI provider is not configured.',
    })
  })

  test('returns a provider failure when fetch fails', async () => {
    const result = await requestOpenAiStructuredOutput({
      apiKey: 'test-key',
      fetcher: vi.fn(async () => {
        throw new Error('network down')
      }),
      input: [
        {
          content: 'Build debrief.',
          role: 'user',
        },
      ],
      model: 'gpt-4o-mini',
      schema: {
        type: 'object',
      },
      schemaName: 'test_schema',
    })

    expect(result).toEqual({
      ok: false,
      message: 'OpenAI debrief provider is unavailable.',
    })
  })
})

interface OpenAiStructuredOutputRequest {
  apiKey: string | null
  fetcher?: typeof fetch
  input: Array<{
    content: string
    role: 'system' | 'user'
  }>
  model: string
  schema: Record<string, unknown>
  schemaName: string
}

export type OpenAiStructuredOutputResult =
  | {
      ok: true
      rawOutput: unknown
      text: string
    }
  | {
      message: string
      ok: false
    }

interface OpenAiResponseBody {
  error?: {
    message?: string
  }
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
  output_text?: string
  status?: string
}

function extractResponseText(body: OpenAiResponseBody) {
  if (typeof body.output_text === 'string') return body.output_text

  for (const output of body.output ?? [])
    for (const content of output.content ?? [])
      if (typeof content.text === 'string') return content.text

  return ''
}

export async function requestOpenAiStructuredOutput({
  apiKey,
  fetcher = fetch,
  input,
  model,
  schema,
  schemaName,
}: OpenAiStructuredOutputRequest): Promise<OpenAiStructuredOutputResult> {
  if (!apiKey)
    return {
      ok: false,
      message: 'OpenAI provider is not configured.',
    }

  try {
    const response = await fetcher('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        max_output_tokens: 1400,
        model,
        text: {
          format: {
            name: schemaName,
            schema,
            strict: true,
            type: 'json_schema',
          },
        },
      }),
      cache: 'no-store',
    })
    const body = (await response.json()) as OpenAiResponseBody

    if (!response.ok)
      return {
        ok: false,
        message:
          body.error?.message ?? 'OpenAI debrief provider request failed.',
      }

    if (body.status && body.status !== 'completed')
      return {
        ok: false,
        message: 'OpenAI debrief response was incomplete.',
      }

    const text = extractResponseText(body).trim()

    if (!text)
      return {
        ok: false,
        message: 'OpenAI debrief provider returned no text.',
      }

    return {
      ok: true,
      rawOutput: body,
      text,
    }
  } catch {
    return {
      ok: false,
      message: 'OpenAI debrief provider is unavailable.',
    }
  }
}

/** Enough for a debrief paragraph. Larger payloads must opt in explicitly. */
const DEFAULT_MAX_OUTPUT_TOKENS = 1400

interface OpenAiStructuredOutputRequest {
  apiKey: string | null
  fetcher?: typeof fetch
  input: Array<{
    content: string
    role: 'system' | 'user'
  }>
  /**
   * Output token ceiling. Reasoning tokens count against this on reasoning
   * models, so a schema with many required array items needs considerably more
   * headroom than its visible JSON suggests. Too low is not a soft failure: the
   * response comes back `incomplete`, unusable, and still billed.
   */
  maxOutputTokens?: number
  model: string
  schema: Record<string, unknown>
  schemaName: string
}

export interface OpenAiUsage {
  inputTokens: number
  outputTokens: number
}

export type OpenAiStructuredOutputResult =
  | {
      ok: true
      rawOutput: unknown
      text: string
      usage: OpenAiUsage | null
    }
  | {
      message: string
      ok: false
    }

interface OpenAiResponseBody {
  error?: {
    message?: string
  }
  incomplete_details?: {
    reason?: string
  }
  output?: Array<{
    content?: Array<{
      text?: string
      type?: string
    }>
  }>
  output_text?: string
  status?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
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
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
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
        max_output_tokens: maxOutputTokens,
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
        // Name the reason and the ceiling. The generic message cost a real
        // (billed) run to diagnose, because "incomplete" reads like a network
        // problem when it is usually just too small a token budget.
        message: `OpenAI response was ${body.status}${
          body.incomplete_details?.reason
            ? ` (${body.incomplete_details.reason})`
            : ''
        }, max_output_tokens=${maxOutputTokens}.`,
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
      usage: body.usage
        ? {
            inputTokens: body.usage.input_tokens ?? 0,
            outputTokens: body.usage.output_tokens ?? 0,
          }
        : null,
    }
  } catch {
    return {
      ok: false,
      message: 'OpenAI debrief provider is unavailable.',
    }
  }
}

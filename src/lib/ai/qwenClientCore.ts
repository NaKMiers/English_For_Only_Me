import { getQwenCompatibleBaseUrl } from '@/constants/environments'

/*
 * Structured output through Qwen's OpenAI-compatible Responses API
 * (`POST /responses`, `text.format` json_schema strict).
 */

/** Enough for a debrief paragraph. Larger payloads must opt in explicitly. */
const DEFAULT_MAX_OUTPUT_TOKENS = 1400

/** Qwen ignores a `'minimal'` effort, so it is not offered. */
type ReasoningEffort = 'low' | 'medium' | 'high'

interface StructuredOutputRequest {
  apiKey: string | null
  /** API root, no trailing slash. Defaults to the DashScope compatible API. */
  baseUrl?: string
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
  /** Unset turns thinking off; set keeps thinking at that effort. */
  reasoningEffort?: ReasoningEffort
  schema: Record<string, unknown>
  schemaName: string
}

export interface AiUsage {
  inputTokens: number
  outputTokens: number
}

export type AiStructuredOutputResult =
  | {
      ok: true
      rawOutput: unknown
      text: string
      usage: AiUsage | null
    }
  | {
      message: string
      ok: false
    }

interface ResponsesApiBody {
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

function extractResponseText(body: ResponsesApiBody) {
  if (typeof body.output_text === 'string') return body.output_text

  for (const output of body.output ?? [])
    for (const content of output.content ?? [])
      if (typeof content.text === 'string') return content.text

  return ''
}

/** Qwen thinks by default; cheap calls (no effort) must switch it off. */
function reasoningFields(reasoningEffort: ReasoningEffort | undefined) {
  return reasoningEffort
    ? { reasoning: { effort: reasoningEffort } }
    : { enable_thinking: false }
}

export async function requestQwenStructuredOutput({
  apiKey,
  baseUrl = getQwenCompatibleBaseUrl(),
  fetcher = fetch,
  input,
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  model,
  reasoningEffort,
  schema,
  schemaName,
}: StructuredOutputRequest): Promise<AiStructuredOutputResult> {
  if (!apiKey)
    return {
      ok: false,
      message: 'AI provider is not configured.',
    }

  try {
    const response = await fetcher(`${baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        max_output_tokens: maxOutputTokens,
        model,
        ...reasoningFields(reasoningEffort),
        // Qwen keeps responses by default; learner text must not stay.
        store: false,
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
    const body = (await response.json()) as ResponsesApiBody

    if (!response.ok)
      return {
        ok: false,
        message: body.error?.message ?? 'AI provider request failed.',
      }

    if (body.status && body.status !== 'completed')
      return {
        ok: false,
        // Name the reason and the ceiling. The generic message cost a real
        // (billed) run to diagnose, because "incomplete" reads like a network
        // problem when it is usually just too small a token budget.
        message: `AI provider response was ${body.status}${
          body.incomplete_details?.reason
            ? ` (${body.incomplete_details.reason})`
            : ''
        }, max_output_tokens=${maxOutputTokens}.`,
      }

    const text = extractResponseText(body).trim()

    if (!text)
      return {
        ok: false,
        message: 'AI provider returned no text.',
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
      message: 'AI provider is unavailable.',
    }
  }
}

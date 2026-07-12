import { VOCAB_LOOKUP_TIMEOUT_MS } from '@/modules/vocabulary/constants'
import type {
  NormalizedProviderPayload,
  VocabProviderInput,
  VocabProviderName,
  VocabProviderResult,
} from '@/modules/vocabulary/providers/types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value.flatMap(item => {
    const text = asString(item)
    return text ? [text] : []
  })
}

export function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)))
}

export function getRetryAfter(response: Response, now: Date) {
  const retryAfter = response.headers.get('retry-after')

  if (!retryAfter) return undefined

  const seconds = Number(retryAfter)
  if (Number.isFinite(seconds)) return new Date(now.getTime() + seconds * 1000)

  const date = new Date(retryAfter)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function fetchProviderJson({
  input,
  provider,
  url,
}: {
  input: VocabProviderInput
  provider: VocabProviderName
  url: string
}): Promise<
  | { data: unknown; ok: true }
  | Exclude<VocabProviderResult, { status: 'ready' | 'emptyUsefulData' }>
> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? VOCAB_LOOKUP_TIMEOUT_MS
  )

  try {
    const fetcher = input.fetcher ?? fetch
    const response = await fetcher(url, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (response.status === 404) return { provider, status: 'notFound' }
    if (response.status === 429)
      return {
        provider,
        retryAfter: getRetryAfter(response, input.now ?? new Date()),
        status: 'rateLimited',
      }
    if (!response.ok)
      return {
        message: `Provider returned HTTP ${response.status}.`,
        provider,
        status: 'malformed',
      }

    return {
      data: await response.json(),
      ok: true,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError')
      return { provider, status: 'timeout' }

    return {
      message: error instanceof Error ? error.message : 'Provider failed.',
      provider,
      status: 'malformed',
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function hasUsefulPayload(payload: NormalizedProviderPayload) {
  return (
    payload.definitions.length > 0 ||
    payload.phonetics.length > 0 ||
    payload.audioUrls.length > 0 ||
    payload.synonyms.length > 0 ||
    payload.relatedWords.length > 0
  )
}

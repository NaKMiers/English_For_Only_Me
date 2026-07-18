import { getMyMemoryEmail } from '@/constants/environments'
import { VOCAB_LOOKUP_TIMEOUT_MS } from '@/modules/vocabulary/constants'

import { asString, isRecord } from './providerUtils'

export const MY_MEMORY_PROVIDER = 'mymemory.translated.net'

interface TranslateInput {
  fetcher?: typeof fetch
  text: string
  timeoutMs?: number
}

function trimToProviderLimit(text: string) {
  const encoder = new TextEncoder()
  let trimmed = text.trim()

  while (encoder.encode(trimmed).length > 480) trimmed = trimmed.slice(0, -20)

  return trimmed.trim()
}

function buildUrl(text: string) {
  const searchParams = new URLSearchParams({
    langpair: 'en|vi',
    mt: '1',
    q: trimToProviderLimit(text),
  })

  // A valid email raises MyMemory's free daily quota (per-IP anonymous is small;
  // email-tracked is ~10x), which bulk enrichment needs. Optional.
  const email = getMyMemoryEmail()
  if (email) searchParams.set('de', email)

  return `https://api.mymemory.translated.net/get?${searchParams.toString()}`
}

export async function translateTextToVietnamese({
  fetcher = fetch,
  text,
  timeoutMs = VOCAB_LOOKUP_TIMEOUT_MS,
}: TranslateInput) {
  const sourceText = trimToProviderLimit(text)

  if (!sourceText) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetcher(buildUrl(sourceText), {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) return null

    const data: unknown = await response.json()
    if (!isRecord(data)) return null

    const responseData = isRecord(data.responseData) ? data.responseData : null
    const translatedText = asString(responseData?.translatedText)

    if (!translatedText || translatedText === sourceText) return null

    return translatedText
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

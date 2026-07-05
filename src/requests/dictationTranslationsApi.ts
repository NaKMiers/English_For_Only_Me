import type { DictationTranslationApiRecord } from '@/modules/dictation/types'

export interface DictationTranslationPayload {
  segmentId: string
  targetLanguage?: string
}

export interface DictationTranslationResponse {
  mode: 'cache' | 'created'
  translation: DictationTranslationApiRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation translation request failed.'
  }

  return 'The dictation translation request failed.'
}

export async function getDictationTranslationApi(
  payload: DictationTranslationPayload,
  input: string = '/api/dictation/translations'
) {
  const response = await fetch(input, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationTranslationResponse
}

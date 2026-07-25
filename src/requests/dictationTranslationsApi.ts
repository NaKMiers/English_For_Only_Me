import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

interface SegmentResponse {
  segment: DictationSegmentApiRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The translation request failed.'
  }

  return 'The translation request failed.'
}

/** Save (or clear, with empty text) a manual translation override for a segment
 * in one language. */
export async function setDictationSegmentTranslationApi(
  {
    language,
    segmentId,
    text,
  }: {
    language: string
    segmentId: string
    text: string
  },
  input: string = `/api/dictation/segments/${segmentId}`
) {
  const response = await fetch(input, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'setTranslation', language, text }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as SegmentResponse
}

/** Ask the AI to translate a segment's sentence into a language. Returns the
 * suggested text (the admin reviews and saves it). */
export async function translateDictationSegmentApi(
  {
    language,
    segmentId,
  }: {
    language: string
    segmentId: string
  },
  input: string = `/api/dictation/segments/${segmentId}/translate`
) {
  const response = await fetch(input, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as { translation: string }
}

import type { DictationSegmentApiRecord } from '@/modules/dictation/types'

interface SegmentHintsResponse {
  segment: DictationSegmentApiRecord
}

async function readApiError(response: Response) {
  const text = await response.text().catch(() => '')

  try {
    const body = JSON.parse(text) as { message?: unknown }

    if (body && typeof body.message === 'string') return body.message
  } catch {
    // Not JSON - fall through and surface the status + a snippet so the real
    // cause (e.g. an auth redirect or a 500 HTML page) is visible.
  }

  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 160)

  return `Hint save failed (HTTP ${response.status})${snippet ? `: ${snippet}` : ''}`
}

/** Save a manual hint override for one segment. The server keeps only words that
 * appear in the sentence, so the returned segment is authoritative. */
export async function setDictationSegmentHintsApi(
  {
    hints,
    segmentId,
  }: {
    hints: string[]
    segmentId: string
  },
  input: string = `/api/dictation/segments/${segmentId}`
) {
  const response = await fetch(input, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'setHints', hints }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as SegmentHintsResponse
}

/** Drop the manual override so practice falls back to the automatic hints. */
export async function resetDictationSegmentHintsApi(
  segmentId: string,
  input: string = `/api/dictation/segments/${segmentId}`
) {
  const response = await fetch(input, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'resetHints' }),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as SegmentHintsResponse
}

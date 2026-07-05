import type { DictationDebriefApiRecord } from '@/modules/dictation/types'

export const DICTATION_DEBRIEFS_API_PATH = '/api/dictation/debriefs'

export interface DictationDebriefPayload {
  notes?: string
  videoId: string
}

export interface DictationDebriefResponse {
  debrief: DictationDebriefApiRecord
  mode: 'cache' | 'created'
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation debrief request failed.'
  }

  return 'The dictation debrief request failed.'
}

export async function createDictationDebriefApi(
  payload: DictationDebriefPayload,
  input: string = DICTATION_DEBRIEFS_API_PATH
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

  return (await response.json()) as DictationDebriefResponse
}

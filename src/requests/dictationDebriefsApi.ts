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

// The server's message is already in the learner's language. Without one the
// error carries no text, so the caller shows its own translated fallback.
async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return ''
  }

  return ''
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

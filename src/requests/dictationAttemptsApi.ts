import type {
  DictationAttemptAction,
  DictationAttemptApiRecord,
  DictationSessionApiRecord,
} from '@/modules/dictation/types'

export interface DictationAttemptPayload {
  action: DictationAttemptAction
  idempotencyKey: string
  replayCountDelta?: number
  segmentId: string
  timeSpentMs?: number
  typedAnswer: string
}

export interface DictationAttemptResponse {
  attempt: DictationAttemptApiRecord
  mode: 'create' | 'idempotent'
  nextSegmentId: string | null
  session: DictationSessionApiRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation attempt request failed.'
  }

  return 'The dictation attempt request failed.'
}

export async function submitDictationAttemptApi(
  sessionId: string,
  payload: DictationAttemptPayload,
  input: string = `/api/dictation/sessions/${sessionId}/attempts`
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

  return (await response.json()) as DictationAttemptResponse
}

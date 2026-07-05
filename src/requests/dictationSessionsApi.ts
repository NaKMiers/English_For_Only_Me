import type { DictationSessionApiRecord } from '@/modules/dictation/types'

export const DICTATION_SESSIONS_API_PATH = '/api/dictation/sessions'

interface DictationSessionResponse {
  mode?: 'resume' | 'start'
  session: DictationSessionApiRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation session request failed.'
  }

  return 'The dictation session request failed.'
}

export async function startOrResumeDictationSessionApi(
  payload: {
    videoId: string
  },
  input: string = DICTATION_SESSIONS_API_PATH
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

  return (await response.json()) as DictationSessionResponse
}

export async function updateDictationSessionApi(
  sessionId: string,
  payload: Partial<
    Pick<
      DictationSessionApiRecord,
      | 'currentSegmentId'
      | 'currentSegmentOrder'
      | 'isVideoHidden'
      | 'playbackSpeed'
      | 'showShortcuts'
      | 'status'
    >
  >,
  input: string = `${DICTATION_SESSIONS_API_PATH}/${sessionId}`
) {
  const response = await fetch(input, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationSessionResponse
}

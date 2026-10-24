import type { PracticeTranslationTrack } from '@/modules/dictation/practice/types'
import type { DictationSessionApiRecord } from '@/modules/dictation/types'

export const DICTATION_SESSIONS_API_PATH = '/api/dictation/sessions'
export const DICTATION_TRANSLATIONS_API_PATH = `${DICTATION_SESSIONS_API_PATH}/translations`

export type DictationSessionPatchPayload = Partial<
  Pick<
    DictationSessionApiRecord,
    | 'currentSegmentId'
    | 'currentSegmentOrder'
    | 'isVideoHidden'
    | 'playbackSpeed'
    | 'showShortcuts'
    | 'status'
  >
>

export function getDictationSessionApiPath(sessionId: string) {
  return `${DICTATION_SESSIONS_API_PATH}/${sessionId}`
}

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

  // The status lets the practice shell retry a 5xx (and 429/408) start with
  // backoff while a 4xx refusal stays final.
  if (!response.ok)
    throw Object.assign(new Error(await readApiError(response)), {
      status: response.status,
    })

  return (await response.json()) as DictationSessionResponse
}

/** Another language's practice translation, fetched when the learner picks it. */
export async function getDictationTranslationTrackApi({
  language,
  videoId,
}: {
  language: string
  videoId: string
}) {
  const query = new URLSearchParams({ language, videoId })
  const response = await fetch(`${DICTATION_TRANSLATIONS_API_PATH}?${query}`, {
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return ((await response.json()) as { track: PracticeTranslationTrack }).track
}

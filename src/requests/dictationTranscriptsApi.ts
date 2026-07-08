import type { DictationTranscriptApiRecord } from '@/modules/dictation/types'

export const DICTATION_TRANSCRIPTS_API_PATH = '/api/dictation/transcripts'

export interface DictationTranscriptPayload {
  videoId: string
  language?: string
  role?: 'primary' | 'translation'
  sourceType?: 'manualText' | 'manualTimedText' | 'captionFile'
  rawText: string
}

interface DictationTranscriptResponse {
  transcript: DictationTranscriptApiRecord
  videoId: string
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The transcript request failed.'
  }

  return 'The transcript request failed.'
}

export async function attachDictationTranscriptApi(
  payload: DictationTranscriptPayload,
  input: string = DICTATION_TRANSCRIPTS_API_PATH
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

  return (await response.json()) as DictationTranscriptResponse
}

// Attach an alternate-language caption track (does not touch the English primary).
export async function attachDictationTranslationTrackApi(
  payload: Omit<DictationTranscriptPayload, 'role'>,
  input: string = DICTATION_TRANSCRIPTS_API_PATH
) {
  return attachDictationTranscriptApi({ ...payload, role: 'translation' }, input)
}

export async function deleteDictationTranscriptApi(
  transcriptId: string,
  input: string = `${DICTATION_TRANSCRIPTS_API_PATH}/${transcriptId}`
) {
  const response = await fetch(input, {
    method: 'DELETE',
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as {
    deleted: boolean
    transcriptId: string
  }
}

import type { YouTubeImportPayload } from '@/modules/dictation/schemas/youtubeImportPayloadSchema'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

export const DICTATION_YOUTUBE_IMPORT_API_PATH =
  '/api/dictation/imports/youtube'

interface YouTubeImportResponse {
  alreadyExists: boolean
  video: DictationVideoApiRecord
  warning: string | null
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The YouTube import request failed.'
  }

  return 'The YouTube import request failed.'
}

export async function importYouTubeVideoApi(
  payload: YouTubeImportPayload,
  input: string = DICTATION_YOUTUBE_IMPORT_API_PATH
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

  return (await response.json()) as YouTubeImportResponse
}

import type {
  CreateDictationVideoPayload,
  UpdateDictationVideoPayload,
} from '@/modules/dictation/schemas/videoPayloadSchema'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

export const DICTATION_VIDEOS_API_PATH = '/api/dictation/videos'

interface DictationVideosResponse {
  videos: DictationVideoApiRecord[]
}

interface DictationVideoResponse {
  video: DictationVideoApiRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation video request failed.'
  }

  return 'The dictation video request failed.'
}

export async function listDictationVideosApi(
  input: string = DICTATION_VIDEOS_API_PATH
) {
  const response = await fetch(input, {
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationVideosResponse
}

export async function createDictationVideoApi(
  payload: CreateDictationVideoPayload,
  input: string = DICTATION_VIDEOS_API_PATH
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

  return (await response.json()) as DictationVideoResponse
}

export async function updateDictationVideoApi(
  videoId: string,
  payload: UpdateDictationVideoPayload,
  input: string = `${DICTATION_VIDEOS_API_PATH}/${videoId}`
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

  return (await response.json()) as DictationVideoResponse
}

export async function archiveDictationVideoApi(
  videoId: string,
  input: string = `${DICTATION_VIDEOS_API_PATH}/${videoId}`
) {
  const response = await fetch(input, {
    method: 'DELETE',
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationVideoResponse
}

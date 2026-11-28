import type {
  DictationSegmentApiRecord,
  DictationTranscriptApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

interface DictationVideoDetailResponse {
  segments: DictationSegmentApiRecord[]
  tracks: DictationTranscriptApiRecord[]
  video: DictationVideoApiRecord
}

const DICTATION_VIDEOS_API_PATH = '/api/dictation/videos'

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation video request failed.'
  }

  return 'The dictation video request failed.'
}

export async function getDictationVideoDetailApi(
  videoId: string,
  input: string = `${DICTATION_VIDEOS_API_PATH}/${videoId}`
) {
  const response = await fetch(input, {
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationVideoDetailResponse
}

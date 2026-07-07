import type {
  DictationSegmentApiRecord,
  DictationSegmentQualityFlag,
  DictationTranscriptQualityStatus,
} from '@/modules/dictation/types'

export function getDictationTranscriptSegmentsApiPath(transcriptId: string) {
  return `/api/dictation/transcripts/${transcriptId}/segments`
}

interface DictationSegmentsResponse {
  qualityFlags: DictationSegmentQualityFlag[]
  qualityStatus: DictationTranscriptQualityStatus
  segments: DictationSegmentApiRecord[]
  transcriptId: string
  videoId: string
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The segment build request failed.'
  }

  return 'The segment build request failed.'
}

export async function buildDictationSegmentsApi(
  transcriptId: string,
  input: string = getDictationTranscriptSegmentsApiPath(transcriptId)
) {
  const response = await fetch(input, {
    method: 'POST',
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationSegmentsResponse
}

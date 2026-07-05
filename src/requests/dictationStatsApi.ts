import type {
  DictationGlobalStatsRecord,
  DictationVideoStatsRecord,
} from '@/modules/dictation/types'

export const DICTATION_STATS_API_PATH = '/api/dictation/stats'

export interface DictationGlobalStatsResponse {
  stats: DictationGlobalStatsRecord
}

export interface DictationVideoStatsResponse {
  stats: DictationVideoStatsRecord
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The dictation stats request failed.'
  }

  return 'The dictation stats request failed.'
}

export async function getDictationGlobalStatsApi(
  input: string = DICTATION_STATS_API_PATH
) {
  const response = await fetch(input, {
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationGlobalStatsResponse
}

export async function getDictationVideoStatsApi({
  input = DICTATION_STATS_API_PATH,
  videoId,
}: {
  input?: string
  videoId: string
}) {
  const response = await fetch(
    `${input}?videoId=${encodeURIComponent(videoId)}`,
    {
      cache: 'no-store',
    }
  )

  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as DictationVideoStatsResponse
}

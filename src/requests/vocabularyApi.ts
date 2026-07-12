import { VOCAB_API_PATHS } from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabAdminQueueSummaryRecord,
  VocabEntryWithUserStateRecord,
  VocabRecallCardRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'
import type { AdminEnrichResult } from '@/modules/vocabulary/enrichment/enrichmentService'

export type VocabEntryResponse = VocabEntryWithUserStateRecord

export interface VocabEntriesResponse {
  entries: VocabEntryWithUserStateRecord[]
}

export interface VocabItemResponse {
  item: UserVocabItemApiRecord
}

export interface VocabRecallCardsResponse {
  cards: VocabRecallCardRecord[]
}

export interface VocabStatsResponse {
  stats: VocabStatsRecord
}

export interface VocabAdminQueueResponse {
  queue: VocabAdminQueueSummaryRecord
}

export interface VocabAdminEnrichResponse {
  queue: VocabAdminQueueSummaryRecord
  result: AdminEnrichResult
}

async function readApiError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown }

    if (typeof body.message === 'string') return body.message
  } catch {
    return 'The vocabulary request failed.'
  }

  return 'The vocabulary request failed.'
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(await readApiError(response))

  return (await response.json()) as T
}

export async function getVocabStatsApi(input = VOCAB_API_PATHS.stats) {
  const response = await fetch(input, { cache: 'no-store' })

  return readJson<VocabStatsResponse>(response)
}

export async function getExploreVocabApi({
  input = VOCAB_API_PATHS.explore,
  limit,
}: {
  input?: string
  limit?: number
} = {}) {
  const params = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  const response = await fetch(`${input}${params}`, { cache: 'no-store' })

  return readJson<VocabEntriesResponse>(response)
}

export async function searchVocabApi({
  input = VOCAB_API_PATHS.search,
  limit,
  query,
}: {
  input?: string
  limit?: number
  query: string
}) {
  const params = new URLSearchParams({ q: query })

  if (limit) params.set('limit', String(limit))

  const response = await fetch(`${input}?${params.toString()}`, {
    cache: 'no-store',
  })

  return readJson<VocabEntriesResponse>(response)
}

export async function lookupVocabEntryApi({
  input = VOCAB_API_PATHS.lookup,
  term,
}: {
  input?: string
  term: string
}) {
  const response = await fetch(input, {
    body: JSON.stringify({
      occurrence: {
        reason: 'dictionaryLookup',
        selectedText: term,
      },
      term,
    }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabEntryResponse>(response)
}

export async function setVocabItemStatusApi({
  input = VOCAB_API_PATHS.items,
  source,
  status,
  vocabEntryId,
}: {
  input?: string
  source: 'search' | 'explore' | 'dictionary' | 'manual'
  status: 'shouldLearn' | 'alreadyKnow'
  vocabEntryId: string
}) {
  const response = await fetch(input, {
    body: JSON.stringify({ source, status, vocabEntryId }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabItemResponse>(response)
}

export async function getDueVocabRecallApi({
  input = VOCAB_API_PATHS.dueRecall,
  limit,
}: {
  input?: string
  limit?: number
} = {}) {
  const params = limit ? `?limit=${encodeURIComponent(String(limit))}` : ''
  const response = await fetch(`${input}${params}`, { cache: 'no-store' })

  return readJson<VocabRecallCardsResponse>(response)
}

export async function answerVocabRecallApi({
  correct,
  input = VOCAB_API_PATHS.recallAnswer,
  itemId,
}: {
  correct: boolean
  input?: string
  itemId: string
}) {
  const response = await fetch(input, {
    body: JSON.stringify({ correct, itemId }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabItemResponse>(response)
}

export async function getVocabAdminQueueApi(
  input = VOCAB_API_PATHS.adminEnrich
) {
  const response = await fetch(input, { cache: 'no-store' })

  return readJson<VocabAdminQueueResponse>(response)
}

export async function enrichVocabularyAdminApi({
  input = VOCAB_API_PATHS.adminEnrich,
  limit,
}: {
  input?: string
  limit: number
}) {
  const response = await fetch(input, {
    body: JSON.stringify({ limit }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabAdminEnrichResponse>(response)
}

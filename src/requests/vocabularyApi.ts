import { VOCAB_API_PATHS } from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabAdminQueueSummaryRecord,
  VocabEntryWithUserStateRecord,
  VocabRecallCardRecord,
  VocabRecallTaskRecord,
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

export interface VocabItemBatchResult {
  vocabEntryId: string
  item: UserVocabItemApiRecord | null
  error?: string
}

export interface VocabItemBatchResponse {
  results: VocabItemBatchResult[]
}

export interface VocabItemStatusUpdate {
  source: 'search' | 'explore' | 'dictionary' | 'manual'
  status: 'shouldLearn' | 'alreadyKnow'
  vocabEntryId: string
}

export interface VocabRecallCardsResponse {
  cards: VocabRecallCardRecord[]
}

export interface VocabRecallTasksResponse {
  tasks: VocabRecallTaskRecord[]
}

export interface VocabStatsResponse {
  stats: VocabStatsRecord
}

export interface VocabRecallAnswerResponse {
  attemptId: string
  isCorrect: boolean
  item: UserVocabItemApiRecord
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

function isObjectId(value: string | null | undefined) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
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
  occurrence,
  term,
}: {
  input?: string
  occurrence?: {
    attemptId?: string | null
    contextSentence?: string | null
    reason:
      | 'manualSearch'
      | 'dictionaryLookup'
      | 'explore'
      | 'clickedInAnswer'
      | 'missedWord'
      | 'aiDebrief'
    segmentId?: string | null
    selectedText?: string | null
    videoId?: string | null
  }
  term: string
}) {
  const safeOccurrence = occurrence
    ? {
        ...occurrence,
        attemptId: isObjectId(occurrence.attemptId)
          ? occurrence.attemptId
          : undefined,
        segmentId: isObjectId(occurrence.segmentId)
          ? occurrence.segmentId
          : undefined,
        videoId: isObjectId(occurrence.videoId)
          ? occurrence.videoId
          : undefined,
      }
    : undefined
  const response = await fetch(input, {
    body: JSON.stringify({
      occurrence: safeOccurrence ?? {
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

export async function setVocabItemStatusBatchApi({
  input = VOCAB_API_PATHS.itemsBatch,
  updates,
}: {
  input?: string
  updates: VocabItemStatusUpdate[]
}) {
  const response = await fetch(input, {
    body: JSON.stringify({ updates }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabItemBatchResponse>(response)
}

export async function getDueVocabRecallApi({
  excludeListening,
  input = VOCAB_API_PATHS.dueRecall,
  limit,
}: {
  excludeListening?: boolean
  input?: string
  limit?: number
} = {}) {
  const params = new URLSearchParams()

  if (limit) params.set('limit', String(limit))
  if (excludeListening) params.set('excludeListening', '1')

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const response = await fetch(`${input}${query}`, { cache: 'no-store' })

  return readJson<VocabRecallTasksResponse>(response)
}

export async function answerVocabRecallApi({
  action,
  input = VOCAB_API_PATHS.recallAnswer,
  idempotencyKey,
  selectedOptionId,
  token,
}: {
  action?: 'lookup' | 'notSure' | 'remember' | null
  input?: string
  idempotencyKey: string
  selectedOptionId?: string | null
  token: string
}) {
  const response = await fetch(input, {
    body: JSON.stringify({ action, idempotencyKey, selectedOptionId, token }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  })

  return readJson<VocabRecallAnswerResponse>(response)
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

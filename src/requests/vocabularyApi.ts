import { VOCAB_API_PATHS } from '@/modules/vocabulary/constants'
import type {
  VocabAdminQueueSummaryRecord,
  VocabEntryWithUserStateRecord,
  VocabOccurrenceReason,
  VocabRecallCardRecord,
  VocabRecallDuePageRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'
import type { AdminEnrichResult } from '@/modules/vocabulary/enrichment/enrichmentService'

export type VocabEntryResponse = VocabEntryWithUserStateRecord

export interface VocabEntriesResponse {
  entries: VocabEntryWithUserStateRecord[]
}

export interface VocabRecallCardsResponse {
  cards: VocabRecallCardRecord[]
}

export type VocabRecallTasksResponse = VocabRecallDuePageRecord

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

export interface VocabOccurrenceInput {
  attemptId?: string | null
  contextSentence?: string | null
  reason: VocabOccurrenceReason
  segmentId?: string | null
  selectedText?: string | null
  videoId?: string | null
}

function toSafeOccurrence(occurrence: VocabOccurrenceInput) {
  return {
    ...occurrence,
    attemptId: isObjectId(occurrence.attemptId)
      ? occurrence.attemptId
      : undefined,
    segmentId: isObjectId(occurrence.segmentId)
      ? occurrence.segmentId
      : undefined,
    videoId: isObjectId(occurrence.videoId) ? occurrence.videoId : undefined,
  }
}

export async function lookupVocabEntryApi({
  input = VOCAB_API_PATHS.lookup,
  occurrence,
  term,
}: {
  input?: string
  occurrence?: VocabOccurrenceInput
  term: string
}) {
  const safeOccurrence = occurrence ? toSafeOccurrence(occurrence) : undefined
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

/**
 * Record that the learner met a word again without re-running the lookup
 * (the entry came from the in-tab lookup cache). Fire-and-forget: it is side
 * data that is safe to lose, so it is not queued in the outbox, and keepalive
 * lets it finish if the learner navigates away right after.
 */
export async function recordVocabOccurrenceApi({
  input = VOCAB_API_PATHS.occurrences,
  occurrence,
  vocabEntryId,
}: {
  input?: string
  occurrence: VocabOccurrenceInput
  vocabEntryId: string
}) {
  const response = await fetch(input, {
    body: JSON.stringify({
      occurrence: toSafeOccurrence(occurrence),
      vocabEntryId,
    }),
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    keepalive: true,
    method: 'POST',
  })

  return readJson<{ ok: true }>(response)
}

export async function getDueVocabRecallApi({
  cursor,
  excludeListening,
  input = VOCAB_API_PATHS.dueRecall,
  limit,
}: {
  cursor?: string | null
  excludeListening?: boolean
  input?: string
  limit?: number
} = {}) {
  const params = new URLSearchParams()

  if (limit) params.set('limit', String(limit))
  if (excludeListening) params.set('excludeListening', '1')
  if (cursor) params.set('cursor', cursor)

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const response = await fetch(`${input}${query}`, { cache: 'no-store' })

  return readJson<VocabRecallTasksResponse>(response)
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

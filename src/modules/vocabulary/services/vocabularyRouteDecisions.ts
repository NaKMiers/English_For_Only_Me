import { z } from 'zod'

import { hasMongoDbUri } from '@/constants/environments'
import {
  VOCAB_ADMIN_ENRICH_DEFAULT_LIMIT,
  VOCAB_ADMIN_ENRICH_MAX_LIMIT,
  VOCAB_EXPLORE_DEFAULT_LIMIT,
  VOCAB_EXPLORE_MAX_LIMIT,
  VOCAB_ITEM_STATUS_BATCH_MAX,
  VOCAB_RECALL_DEFAULT_LIMIT,
  VOCAB_RECALL_MAX_LIMIT,
  VOCAB_SEARCH_DEFAULT_LIMIT,
  VOCAB_SEARCH_MAX_LIMIT,
  VOCAB_WORD_LIST_DEFAULT_PAGE_SIZE,
  VOCAB_WORD_LIST_MAX_PAGE_SIZE,
} from '@/modules/vocabulary/constants'
import {
  decodeVocabRecallDueCursor,
  VOCAB_RECALL_DUE_CURSOR_PATTERN,
  type VocabRecallDueCursor,
} from '@/modules/vocabulary/recall/recallDueCursor'
import type { VocabWordListView } from '@/modules/vocabulary/types'

type ApiErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503

export interface VocabApiErrorDecision {
  status: ApiErrorStatus
  body: {
    message: string
  }
}

export const VOCAB_MISSING_MONGODB_MESSAGE =
  'MongoDB is not configured. Set MONGODB_URI on the server to use the vocabulary module.'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const optionalObjectIdSchema = objectIdSchema.nullish()

const occurrenceSchema = z
  .object({
    attemptId: optionalObjectIdSchema,
    contextSentence: z.string().trim().max(3000).nullish(),
    reason: z
      .enum([
        'manualSearch',
        'dictionaryLookup',
        'explore',
        'clickedInAnswer',
        'missedWord',
        'aiDebrief',
      ])
      .default('dictionaryLookup'),
    segmentId: optionalObjectIdSchema,
    selectedText: z.string().trim().max(500).nullish(),
    videoId: optionalObjectIdSchema,
  })
  .strict()
  .optional()

const lookupEntrySchema = z
  .object({
    occurrence: occurrenceSchema,
    term: z.string().trim().min(1).max(80),
  })
  .strict()

const searchSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(VOCAB_SEARCH_MAX_LIMIT)
    .default(VOCAB_SEARCH_DEFAULT_LIMIT),
  q: z.string().trim().min(1).max(80),
})

const exploreSchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(VOCAB_EXPLORE_MAX_LIMIT)
    .default(VOCAB_EXPLORE_DEFAULT_LIMIT),
})

const itemStatusSchema = z
  .object({
    occurrenceReason: z
      .enum([
        'manualSearch',
        'dictionaryLookup',
        'explore',
        'clickedInAnswer',
        'missedWord',
        'aiDebrief',
      ])
      .optional(),
    source: z
      .enum(['search', 'explore', 'dictionary', 'manual', 'ielts'])
      .default('manual'),
    status: z.enum(['shouldLearn', 'alreadyKnow']),
    vocabEntryId: objectIdSchema,
  })
  .strict()

const itemStatusBatchSchema = z
  .object({
    updates: z.array(itemStatusSchema).min(1).max(VOCAB_ITEM_STATUS_BATCH_MAX),
  })
  .strict()

const recallDueSchema = z.object({
  cursor: z
    .string()
    .regex(VOCAB_RECALL_DUE_CURSOR_PATTERN)
    .optional()
    .transform(
      (value): VocabRecallDueCursor | null =>
        (value && decodeVocabRecallDueCursor(value)) || null
    ),
  excludeListening: z
    .enum(['0', '1', 'false', 'true'])
    .optional()
    .transform(value => value === '1' || value === 'true'),
  // Clamped rather than rejected: a tab still running the old bundle asks for
  // 1000 and should get a page, not an error.
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .transform(value => Math.min(value, VOCAB_RECALL_MAX_LIMIT))
    .default(VOCAB_RECALL_DEFAULT_LIMIT),
})

const occurrenceRecordSchema = z
  .object({
    occurrence: occurrenceSchema.unwrap(),
    vocabEntryId: objectIdSchema,
  })
  .strict()

const wordListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).catch(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(VOCAB_WORD_LIST_MAX_PAGE_SIZE)
    .catch(VOCAB_WORD_LIST_DEFAULT_PAGE_SIZE),
  view: z
    .enum(['learning', 'dueToday', 'alreadyKnow', 'mastered', 'knownTotal'])
    .catch('learning'),
})

const recallAnswerSchema = z
  .object({
    action: z.enum(['lookup', 'notSure', 'remember']).nullish(),
    idempotencyKey: z.string().trim().min(8).max(160),
    selectedOptionId: z.string().trim().min(1).max(160).nullish(),
    token: z.string().trim().min(20).max(5000),
  })
  .strict()

const adminEnrichSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(VOCAB_ADMIN_ENRICH_MAX_LIMIT)
      .default(VOCAB_ADMIN_ENRICH_DEFAULT_LIMIT),
  })
  .strict()

export type ParsedLookupEntryRequest = z.infer<typeof lookupEntrySchema>
export type ParsedSearchRequest = z.infer<typeof searchSchema>
export type ParsedExploreRequest = z.infer<typeof exploreSchema>
export type ParsedItemStatusRequest = z.infer<typeof itemStatusSchema>
export type ParsedItemStatusBatchRequest = z.infer<typeof itemStatusBatchSchema>
export type ParsedRecallDueRequest = z.infer<typeof recallDueSchema>
export type ParsedOccurrenceRecordRequest = z.infer<
  typeof occurrenceRecordSchema
>
export type ParsedRecallAnswerRequest = z.infer<typeof recallAnswerSchema>
export type ParsedAdminEnrichRequest = z.infer<typeof adminEnrichSchema>

export type VocabRouteDecision<T> =
  { data: T; ok: true } | (VocabApiErrorDecision & { ok: false })

function invalid(message: string): VocabApiErrorDecision & { ok: false } {
  return {
    body: { message },
    ok: false,
    status: 400,
  }
}

export function getMissingVocabMongoResponse() {
  if (hasMongoDbUri()) return null

  return {
    status: 500,
    body: {
      message: VOCAB_MISSING_MONGODB_MESSAGE,
    },
  } satisfies VocabApiErrorDecision
}

export function parseLookupEntryRequest(
  body: unknown
): VocabRouteDecision<ParsedLookupEntryRequest> {
  const result = lookupEntrySchema.safeParse(body)

  if (!result.success) return invalid('Vocabulary lookup payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseSearchRequest(
  searchParams: URLSearchParams
): VocabRouteDecision<ParsedSearchRequest> {
  const result = searchSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
  })

  if (!result.success) return invalid('Vocabulary search query is invalid.')

  return { data: result.data, ok: true }
}

export function parseExploreRequest(
  searchParams: URLSearchParams
): VocabRouteDecision<ParsedExploreRequest> {
  const result = exploreSchema.safeParse({
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!result.success) return invalid('Vocabulary explore query is invalid.')

  return { data: result.data, ok: true }
}

export function parseItemStatusRequest(
  body: unknown
): VocabRouteDecision<ParsedItemStatusRequest> {
  const result = itemStatusSchema.safeParse(body)

  if (!result.success) return invalid('Vocabulary item payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseItemStatusBatchRequest(
  body: unknown
): VocabRouteDecision<ParsedItemStatusBatchRequest> {
  const result = itemStatusBatchSchema.safeParse(body)

  if (!result.success)
    return invalid('Vocabulary item batch payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseRecallDueRequest(
  searchParams: URLSearchParams
): VocabRouteDecision<ParsedRecallDueRequest> {
  const result = recallDueSchema.safeParse({
    cursor: searchParams.get('cursor') ?? undefined,
    excludeListening: searchParams.get('excludeListening') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })

  if (!result.success) return invalid('Vocabulary recall query is invalid.')

  return { data: result.data, ok: true }
}

export function parseOccurrenceRecordRequest(
  body: unknown
): VocabRouteDecision<ParsedOccurrenceRecordRequest> {
  const result = occurrenceRecordSchema.safeParse(body)

  if (!result.success)
    return invalid('Vocabulary occurrence payload is invalid.')

  return { data: result.data, ok: true }
}

export interface VocabWordListQuery {
  page: number
  perPage: number
  view: VocabWordListView
}

type SearchParamValue = string | string[] | undefined

function firstParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Word list page query. Never fails: a bad value falls back to its default so
 * a hand-edited URL still renders a page.
 */
export function parseVocabWordListQuery(params: {
  page?: SearchParamValue
  perPage?: SearchParamValue
  view?: SearchParamValue
}): VocabWordListQuery {
  return wordListQuerySchema.parse({
    page: firstParam(params.page),
    perPage: firstParam(params.perPage),
    view: firstParam(params.view),
  })
}

export function parseRecallAnswerRequest(
  body: unknown
): VocabRouteDecision<ParsedRecallAnswerRequest> {
  const result = recallAnswerSchema.safeParse(body)

  if (!result.success) return invalid('Vocabulary recall payload is invalid.')

  return { data: result.data, ok: true }
}

export function parseAdminEnrichRequest(
  body: unknown
): VocabRouteDecision<ParsedAdminEnrichRequest> {
  const result = adminEnrichSchema.safeParse(body)

  if (!result.success) return invalid('Vocabulary enrich payload is invalid.')

  return { data: result.data, ok: true }
}

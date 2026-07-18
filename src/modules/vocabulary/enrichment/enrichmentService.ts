import 'server-only'

import { randomUUID } from 'node:crypto'

import type { QueryFilter } from 'mongoose'

import {
  VocabEntryModel,
  type VocabEntryDocument,
} from '@/models/vocabulary/VocabEntryModel'
import {
  ENRICHABLE_ENTRY_STATUSES,
  VOCAB_DEFAULT_LANGUAGE,
  VOCAB_DEFAULT_LOCALIZED_LANGUAGE,
  VOCAB_ENRICHMENT_LEASE_MS,
  VOCAB_LOOKUP_TIMEOUT_MS,
} from '@/modules/vocabulary/constants'
import {
  getDefaultVocabProviders,
  type VocabProviderAdapter,
  type VocabProviderResult,
} from '@/modules/vocabulary/providers'
import {
  MY_MEMORY_PROVIDER,
  translateTextToVietnamese,
} from '@/modules/vocabulary/providers/myMemoryTranslate'
import type {
  VocabAdminQueueSummaryRecord,
  VocabAudioUrlRecord,
  VocabDefinitionRecord,
  VocabEntryApiRecord,
  VocabExampleRecord,
  VocabLocalizedMeaningRecord,
  VocabPhoneticRecord,
  VocabRelatedWordRecord,
  VocabSourceAttributionRecord,
} from '@/modules/vocabulary/types'
import {
  VOCAB_MISSING_VI_MEANING_FILTER,
  VOCAB_REQUIRES_VI_MEANING_FILTER,
} from '@/modules/vocabulary/vietnameseMeaning'

import { toVocabEntryRecord } from '../services/vocabEntryRecords'

const RETRY_DELAY_MS = 60 * 60 * 1000

interface LockedEntry {
  _id: unknown
  audioUrls?: VocabAudioUrlRecord[] | null
  definitions?: VocabDefinitionRecord[] | null
  examples?: VocabExampleRecord[] | null
  language?: string | null
  localizedMeanings?: VocabLocalizedMeaningRecord[] | null
  normalizedTerm: string
  phonetics?: VocabPhoneticRecord[] | null
  relatedWords?: VocabRelatedWordRecord[] | null
  sourceAttributions?: VocabSourceAttributionRecord[] | null
  synonyms?: string[] | null
  antonyms?: string[] | null
  term: string
  [key: string]: unknown
}

export interface AdminEnrichResult {
  errors: string[]
  failed: number
  notFound: number
  processed: number
  rateLimited: number
  ready: number
  requested: number
  skipped: number
}

function getLeaseDates(now: Date) {
  return {
    enrichmentLeaseExpiresAt: new Date(
      now.getTime() + VOCAB_ENRICHMENT_LEASE_MS
    ),
    enrichmentLockedAt: now,
  }
}

function getEligibleLeaseFilter(
  now: Date,
  entryId?: string
): QueryFilter<VocabEntryDocument> {
  return {
    ...(entryId ? { _id: entryId } : {}),
    $or: [
      { enrichmentStatus: { $in: ['seeded', 'pending'] } },
      {
        enrichmentStatus: 'ready',
        ...VOCAB_MISSING_VI_MEANING_FILTER,
      },
      {
        enrichmentStatus: 'failed',
        $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
      },
      {
        enrichmentStatus: 'enriching',
        enrichmentLeaseExpiresAt: { $lte: now },
      },
    ],
  }
}

function getProviderRawKey(provider: string) {
  return provider.replace(/[^a-z0-9]/gi, '_')
}

function mergeByKey<T>(
  left: T[] | null | undefined,
  right: T[],
  getKey: (value: T) => string
) {
  const values = [...(left ?? []), ...right]
  const seen = new Set<string>()
  const merged: T[] = []

  for (const value of values) {
    const key = getKey(value)
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(value)
  }

  return merged
}

function mergeStrings(left: string[] | null | undefined, right: string[]) {
  return Array.from(new Set([...(left ?? []), ...right])).filter(Boolean)
}

function hasVietnameseMeaning(
  meanings: VocabLocalizedMeaningRecord[] | null | undefined
) {
  return Boolean(
    meanings?.some(
      meaning =>
        meaning.language === VOCAB_DEFAULT_LOCALIZED_LANGUAGE &&
        meaning.meaning.trim().length > 0
    )
  )
}

async function buildVietnameseMeanings({
  existingMeanings,
  fetcher,
  partOfSpeech,
  term,
}: {
  existingMeanings?: VocabLocalizedMeaningRecord[] | null
  fetcher?: typeof fetch
  partOfSpeech?: string | null
  term: string
}) {
  const meanings = [...(existingMeanings ?? [])]

  if (hasVietnameseMeaning(meanings)) return meanings

  const translated = await translateTextToVietnamese({
    fetcher,
    text: term,
    timeoutMs: VOCAB_LOOKUP_TIMEOUT_MS,
  })

  if (translated)
    meanings.push({
      language: VOCAB_DEFAULT_LOCALIZED_LANGUAGE,
      license: null,
      meaning: translated,
      partOfSpeech: partOfSpeech ?? null,
      source: MY_MEMORY_PROVIDER,
    })

  return meanings
}

async function acquireEnrichmentLease({
  entryId,
  now,
}: {
  entryId: string
  now: Date
}) {
  const lockId = randomUUID()
  const locked = await VocabEntryModel.findOneAndUpdate(
    getEligibleLeaseFilter(now, entryId),
    {
      $inc: { enrichmentAttempts: 1 },
      $set: {
        ...getLeaseDates(now),
        enrichmentLockId: lockId,
        enrichmentStatus: 'enriching',
      },
    },
    {
      returnDocument: 'after',
    }
  ).lean<LockedEntry | null>()

  return locked ? { entry: locked, lockId } : null
}

async function acquireNextEnrichmentLease({ now }: { now: Date }) {
  const lockId = randomUUID()
  const locked = await VocabEntryModel.findOneAndUpdate(
    getEligibleLeaseFilter(now),
    {
      $inc: { enrichmentAttempts: 1 },
      $set: {
        ...getLeaseDates(now),
        enrichmentLockId: lockId,
        enrichmentStatus: 'enriching',
      },
    },
    {
      returnDocument: 'after',
      sort: { frequencyRank: 1, updatedAt: 1 },
    }
  ).lean<LockedEntry | null>()

  return locked ? { entry: locked, lockId } : null
}

async function runProviders({
  entry,
  fetcher,
  now,
  providers,
}: {
  entry: LockedEntry
  fetcher?: typeof fetch
  now: Date
  providers: VocabProviderAdapter[]
}) {
  const results: VocabProviderResult[] = []

  for (const provider of providers) {
    const result = await provider({
      fetcher,
      language: entry.language ?? VOCAB_DEFAULT_LANGUAGE,
      now,
      term: entry.normalizedTerm,
      timeoutMs: VOCAB_LOOKUP_TIMEOUT_MS,
    })

    results.push(result)

    if (result.status === 'ready') return { result, results }
  }

  return { result: null, results }
}

function toProviderError(
  result: Exclude<VocabProviderResult, { status: 'ready' }>,
  now: Date
) {
  return {
    at: now,
    message:
      result.status === 'malformed'
        ? result.message
        : `Provider returned ${result.status}.`,
    provider: result.provider,
    status: result.status,
  }
}

async function persistReadyResult({
  entry,
  fetcher,
  lockId,
  now,
  result,
}: {
  entry: LockedEntry
  fetcher?: typeof fetch
  lockId: string
  now: Date
  result: Extract<VocabProviderResult, { status: 'ready' }>
}) {
  const payload = result.payload
  const mergedDefinitions = mergeByKey(
    entry.definitions,
    payload.definitions,
    item => `${item.partOfSpeech ?? ''}:${item.definition}`
  )
  const localizedMeanings = await buildVietnameseMeanings({
    existingMeanings: mergeByKey(
      entry.localizedMeanings,
      payload.localizedMeanings,
      item => `${item.language}:${item.partOfSpeech ?? ''}:${item.meaning}`
    ),
    fetcher,
    partOfSpeech: payload.partOfSpeech ?? mergedDefinitions[0]?.partOfSpeech,
    term: entry.term,
  })
  const isReady = hasVietnameseMeaning(localizedMeanings)
  const update = {
    ...(isReady
      ? {}
      : {
          $push: {
            providerErrors: {
              at: now,
              message: 'Vietnamese meaning is required before this word is ready.',
              provider: MY_MEMORY_PROVIDER,
              status: 'missingVietnameseMeaning',
            },
          },
        }),
    $set: {
      [`rawProviderData.${getProviderRawKey(result.provider)}`]:
        payload.rawData,
      audioUrls: mergeByKey(
        entry.audioUrls,
        payload.audioUrls,
        item => item.url
      ),
      definitions: mergedDefinitions,
      examples: mergeByKey(entry.examples, payload.examples, item => item.text),
      enrichmentLeaseExpiresAt: null,
      enrichmentLockId: null,
      enrichmentLockedAt: null,
      enrichmentStatus: isReady ? 'ready' : 'failed',
      lastEnrichedAt: now,
      lemma: payload.lemma,
      license: payload.license,
      localizedMeanings,
      nextRetryAt: isReady ? null : new Date(now.getTime() + RETRY_DELAY_MS),
      partOfSpeech: payload.partOfSpeech,
      phonetics: mergeByKey(
        entry.phonetics,
        payload.phonetics,
        item => item.text
      ),
      relatedWords: mergeByKey(
        entry.relatedWords,
        payload.relatedWords,
        item => `${item.relation}:${item.term}`
      ),
      sourceAttributions: mergeByKey(
        entry.sourceAttributions,
        payload.sourceAttributions,
        item => `${item.provider}:${item.url}`
      ),
      synonyms: mergeStrings(entry.synonyms, payload.synonyms),
      antonyms: mergeStrings(entry.antonyms, payload.antonyms),
    },
  }

  const updated = await VocabEntryModel.findOneAndUpdate(
    {
      _id: entry._id,
      enrichmentLockId: lockId,
    },
    update,
    { returnDocument: 'after' }
  ).lean()

  return updated ? toVocabEntryRecord(updated) : null
}

async function persistFailedResult({
  entry,
  lockId,
  now,
  results,
}: {
  entry: LockedEntry
  lockId: string
  now: Date
  results: Exclude<VocabProviderResult, { status: 'ready' }>[]
}) {
  const allNotFound =
    results.length > 0 && results.every(result => result.status === 'notFound')
  const hasRateLimit = results.some(result => result.status === 'rateLimited')
  const retryAfter = results
    .flatMap(result =>
      result.status === 'rateLimited' && result.retryAfter
        ? [result.retryAfter]
        : []
    )
    .sort((left, right) => left.getTime() - right.getTime())[0]
  const status: VocabEntryApiRecord['enrichmentStatus'] = allNotFound
    ? 'notFound'
    : 'failed'

  const updated = await VocabEntryModel.findOneAndUpdate(
    {
      _id: entry._id,
      enrichmentLockId: lockId,
    },
    {
      $push: {
        providerErrors: {
          $each: results.map(result => toProviderError(result, now)),
          $slice: -20,
        },
      },
      $set: {
        enrichmentLeaseExpiresAt: null,
        enrichmentLockId: null,
        enrichmentLockedAt: null,
        enrichmentStatus: status,
        lastEnrichedAt: now,
        nextRetryAt:
          status === 'failed'
            ? (retryAfter ?? new Date(now.getTime() + RETRY_DELAY_MS))
            : null,
      },
    },
    { returnDocument: 'after' }
  ).lean()

  return {
    entry: updated ? toVocabEntryRecord(updated) : null,
    rateLimited: hasRateLimit,
    status,
  }
}

export async function enrichVocabEntryIfNeeded({
  entryId,
  fetcher,
  now = new Date(),
  providers = getDefaultVocabProviders(),
}: {
  entryId: string
  fetcher?: typeof fetch
  now?: Date
  providers?: VocabProviderAdapter[]
}) {
  const locked = await acquireEnrichmentLease({ entryId, now })

  if (!locked) {
    const entry = await VocabEntryModel.findById(entryId).lean()
    return entry ? toVocabEntryRecord(entry) : null
  }

  const { result, results } = await runProviders({
    entry: locked.entry,
    fetcher,
    now,
    providers,
  })

  if (result)
    return persistReadyResult({
      entry: locked.entry,
      fetcher,
      lockId: locked.lockId,
      now,
      result,
    })

  const persisted = await persistFailedResult({
    entry: locked.entry,
    lockId: locked.lockId,
    now,
    results: results as Exclude<VocabProviderResult, { status: 'ready' }>[],
  })

  return persisted.entry
}

async function processLockedEntry({
  fetcher,
  locked,
  now,
  providers,
}: {
  fetcher?: typeof fetch
  locked: { entry: LockedEntry; lockId: string }
  now: Date
  providers: VocabProviderAdapter[]
}) {
  const { result, results } = await runProviders({
    entry: locked.entry,
    fetcher,
    now,
    providers,
  })

  if (result) {
    const entry = await persistReadyResult({
      entry: locked.entry,
      fetcher,
      lockId: locked.lockId,
      now,
      result,
    })

    if (!entry) return { status: 'skipped' } as const

    return entry.enrichmentStatus === 'ready'
      ? ({ status: 'ready' } as const)
      : ({ status: 'failed' } as const)
  }

  const persisted = await persistFailedResult({
    entry: locked.entry,
    lockId: locked.lockId,
    now,
    results: results as Exclude<VocabProviderResult, { status: 'ready' }>[],
  })

  if (!persisted.entry) return { status: 'skipped' } as const
  if (persisted.rateLimited) return { status: 'rateLimited' } as const

  return { status: persisted.status } as const
}

export async function enrichNextVocabularyEntries({
  fetcher,
  limit,
  now = new Date(),
  providers = getDefaultVocabProviders(),
}: {
  fetcher?: typeof fetch
  limit: number
  now?: Date
  providers?: VocabProviderAdapter[]
}): Promise<AdminEnrichResult> {
  const requested = Math.max(1, Math.min(limit, 10))
  const summary: AdminEnrichResult = {
    errors: [],
    failed: 0,
    notFound: 0,
    processed: 0,
    rateLimited: 0,
    ready: 0,
    requested,
    skipped: 0,
  }
  let claimed = 0

  async function worker() {
    while (claimed < requested) {
      claimed += 1
      const locked = await acquireNextEnrichmentLease({ now })

      if (!locked) break

      try {
        const result = await processLockedEntry({
          fetcher,
          locked,
          now,
          providers,
        })

        summary.processed += 1
        if (result.status === 'ready') summary.ready += 1
        if (result.status === 'failed') summary.failed += 1
        if (result.status === 'notFound') summary.notFound += 1
        if (result.status === 'rateLimited') summary.rateLimited += 1
        if (result.status === 'skipped') summary.skipped += 1
      } catch (error) {
        summary.failed += 1
        summary.errors.push(
          error instanceof Error ? error.message : 'Unknown enrichment error.'
        )
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(2, requested) }, worker))

  summary.skipped += Math.max(0, requested - summary.processed)

  return summary
}

export async function getVocabAdminQueueSummary(
  now = new Date()
): Promise<VocabAdminQueueSummaryRecord> {
  const [seededCount, readyCount, failedCount, notFoundCount, staleLeaseCount] =
    await Promise.all([
      VocabEntryModel.countDocuments({
        $or: [
          {
            enrichmentStatus: { $in: ENRICHABLE_ENTRY_STATUSES },
            $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
          },
          {
            enrichmentStatus: 'ready',
            ...VOCAB_MISSING_VI_MEANING_FILTER,
          },
        ],
      }),
      VocabEntryModel.countDocuments({
        enrichmentStatus: 'ready',
        ...VOCAB_REQUIRES_VI_MEANING_FILTER,
      }),
      VocabEntryModel.countDocuments({ enrichmentStatus: 'failed' }),
      VocabEntryModel.countDocuments({ enrichmentStatus: 'notFound' }),
      VocabEntryModel.countDocuments({
        enrichmentStatus: 'enriching',
        enrichmentLeaseExpiresAt: { $lte: now },
      }),
    ])

  return {
    failedCount,
    notFoundCount,
    readyCount,
    seededCount,
    staleLeaseCount,
  }
}

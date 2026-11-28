import 'server-only'

import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import {
  VOCAB_DEFAULT_LANGUAGE,
  VOCAB_SEARCH_DEFAULT_LIMIT,
  VOCAB_SEARCH_MAX_LIMIT,
} from '@/modules/vocabulary/constants'
import { normalizeVocabTerm } from '@/modules/vocabulary/normalizeVocabTerm'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import { toUserVocabItemRecord } from './userVocabItemRecords'
import { toVocabEntryRecord } from './vocabEntryRecords'

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}

export async function findOrCreateVocabEntryShell({
  language = VOCAB_DEFAULT_LANGUAGE,
  term,
}: {
  language?: string
  term: string
}) {
  const normalized = normalizeVocabTerm(term)

  if (!normalized) return null

  const existing = await VocabEntryModel.findOne({
    language,
    normalizedTerm: normalized.normalizedTerm,
  }).lean()

  if (existing) return toVocabEntryRecord(existing)

  try {
    const created = await VocabEntryModel.create({
      language,
      term: normalized.term,
      normalizedTerm: normalized.normalizedTerm,
      entryType: normalized.entryType,
      enrichmentStatus: 'pending',
    })

    return toVocabEntryRecord(created.toObject())
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    const raced = await VocabEntryModel.findOne({
      language,
      normalizedTerm: normalized.normalizedTerm,
    }).lean()

    return raced ? toVocabEntryRecord(raced) : null
  }
}

export async function getVocabEntryWithUserState({
  entryId,
  userId,
}: {
  entryId: string
  userId: string
}): Promise<VocabEntryWithUserStateRecord | null> {
  const [entry, userItem] = await Promise.all([
    VocabEntryModel.findById(entryId).lean(),
    UserVocabItemModel.findOne({
      userId,
      vocabEntryId: entryId,
    }).lean(),
  ])

  if (!entry) return null

  return {
    entry: toVocabEntryRecord(entry),
    userItem: userItem ? toUserVocabItemRecord(userItem) : null,
  }
}

export async function searchVocabEntries({
  language = VOCAB_DEFAULT_LANGUAGE,
  limit = VOCAB_SEARCH_DEFAULT_LIMIT,
  query,
  userId,
}: {
  language?: string
  limit?: number
  query: string
  userId: string
}): Promise<VocabEntryWithUserStateRecord[]> {
  const normalized = normalizeVocabTerm(query)

  if (!normalized) return []

  const finalLimit = Math.min(Math.max(limit, 1), VOCAB_SEARCH_MAX_LIMIT)
  const regex = new RegExp(
    `^${normalized.normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  )

  const entries = await VocabEntryModel.find({
    language,
    normalizedTerm: regex,
    ...VOCAB_REQUIRES_VI_MEANING_FILTER,
  })
    .sort({ frequencyRank: 1, normalizedTerm: 1 })
    .limit(finalLimit)
    .lean()

  if (entries.length === 0) return []

  const entryIds = entries.map(entry => entry._id)
  const userItems = await UserVocabItemModel.find({
    userId,
    vocabEntryId: { $in: entryIds },
  }).lean()
  const userItemByEntryId = new Map(
    userItems.map(item => [String(item.vocabEntryId), item])
  )

  return entries.map(entry => {
    const userItem = userItemByEntryId.get(String(entry._id))

    return {
      entry: toVocabEntryRecord(entry),
      userItem: userItem ? toUserVocabItemRecord(userItem) : null,
    }
  })
}

/**
 * Which of these terms the learner already has in their vocabulary (any
 * saved status), as the input strings: lets a "Save word" button start in
 * its saved state. Terms that do not normalize are skipped.
 */
export async function listSavedTermsForUser({
  language = VOCAB_DEFAULT_LANGUAGE,
  terms,
  userId,
}: {
  language?: string
  terms: string[]
  userId: string
}): Promise<string[]> {
  const byNormalized = new Map<string, string[]>()

  for (const term of terms) {
    const normalized = normalizeVocabTerm(term)?.normalizedTerm

    if (!normalized) continue

    byNormalized.set(normalized, [
      ...(byNormalized.get(normalized) ?? []),
      term,
    ])
  }

  if (byNormalized.size === 0) return []

  const entries = await VocabEntryModel.find({
    language,
    normalizedTerm: { $in: [...byNormalized.keys()] },
  })
    .select('_id normalizedTerm')
    .lean()

  if (entries.length === 0) return []

  const saved = await UserVocabItemModel.find({
    userId,
    vocabEntryId: { $in: entries.map(entry => entry._id) },
  })
    .select('vocabEntryId')
    .lean()
  const savedIds = new Set(saved.map(item => String(item.vocabEntryId)))

  return entries
    .filter(entry => savedIds.has(String(entry._id)))
    .flatMap(entry => byNormalized.get(String(entry.normalizedTerm)) ?? [])
}

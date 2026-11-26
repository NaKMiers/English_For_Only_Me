import 'server-only'

import { Types } from 'mongoose'

import { IeltsTestVocabModel } from '@/models/ielts/IeltsTestVocabModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { toUserVocabItemRecord } from '@/modules/vocabulary/services/userVocabItemRecords'
import { toVocabEntryRecord } from '@/modules/vocabulary/services/vocabEntryRecords'
import type {
  VocabEntryApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'
import { REQUIRED_VOCAB_MEANING_LANGUAGE } from '@/modules/vocabulary/vietnameseMeaning'

import { IELTS_TEST_VOCAB_MAX } from '../constants'

type LeanEntry = Parameters<typeof toVocabEntryRecord>[0]

/**
 * The card only shows the term, pronunciation, the Vietnamese meaning and the
 * first definition. A full dictionary record is ~10 KB, so the list keeps
 * just those parts and the page stays light with 60+ words.
 */
export function toCompactVocabEntry(
  entry: VocabEntryApiRecord
): VocabEntryApiRecord {
  return {
    ...entry,
    definitions: entry.definitions.slice(0, 1),
    examples: [],
    localizedMeanings: entry.localizedMeanings.filter(
      meaning => meaning.language === REQUIRED_VOCAB_MEANING_LANGUAGE
    ),
    phonetics: entry.phonetics.slice(0, 2),
    providerErrors: [],
    relatedWords: [],
    sourceAttributions: [],
    synonyms: [],
    antonyms: [],
  }
}

async function readEntryIds(slug: string) {
  const doc = await IeltsTestVocabModel.findOne({ slug }, { entryIds: 1 })
    .lean()
    .exec()

  return (doc?.entryIds ?? []).map(id => String(id))
}

/** Entries in the stored order; ids whose entry was deleted are skipped. */
async function readEntriesInOrder(entryIds: string[]) {
  if (!entryIds.length) return []

  const docs = (await VocabEntryModel.find({
    _id: { $in: entryIds },
  }).lean()) as unknown as LeanEntry[]
  const byId = new Map(docs.map(doc => [String(doc._id), doc]))

  return entryIds.flatMap(id => {
    const doc = byId.get(id)

    return doc ? [toCompactVocabEntry(toVocabEntryRecord(doc))] : []
  })
}

/** The test's words with the learner's own Should Learn / Already Know. */
export async function listIeltsTestVocabForLearner({
  slug,
  userId,
}: {
  slug: string
  userId: string | null
}): Promise<VocabEntryWithUserStateRecord[]> {
  const entries = await readEntriesInOrder(await readEntryIds(slug))

  if (!entries.length) return []

  const userItems = userId
    ? await UserVocabItemModel.find({
        userId,
        vocabEntryId: { $in: entries.map(entry => entry.id) },
      }).lean()
    : []
  const itemByEntryId = new Map(
    userItems.map(item => [String(item.vocabEntryId), item])
  )

  return entries.map(entry => {
    const item = itemByEntryId.get(entry.id)

    return { entry, userItem: item ? toUserVocabItemRecord(item) : null }
  })
}

export async function listIeltsTestVocabForAdmin(slug: string) {
  return readEntriesInOrder(await readEntryIds(slug))
}

/**
 * Replace the test's word list. Unknown ids are dropped (an entry deleted
 * while the editor was open), duplicates keep their first position.
 */
export async function saveIeltsTestVocab({
  entryIds,
  slug,
  updatedBy,
}: {
  entryIds: string[]
  slug: string
  updatedBy: string
}) {
  const unique = [...new Set(entryIds)].slice(0, IELTS_TEST_VOCAB_MAX)
  const existing = new Set(
    (
      await VocabEntryModel.find({ _id: { $in: unique } }, { _id: 1 }).lean()
    ).map(doc => String(doc._id))
  )
  const kept = unique.filter(id => existing.has(id))

  await IeltsTestVocabModel.updateOne(
    { slug },
    {
      $set: {
        entryIds: kept.map(id => new Types.ObjectId(id)),
        updatedBy,
      },
    },
    { upsert: true }
  )

  return readEntriesInOrder(kept)
}

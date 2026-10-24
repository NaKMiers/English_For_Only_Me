import 'server-only'

import type { PipelineStage, QueryFilter, Types } from 'mongoose'

import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  UserVocabItemModel,
  type UserVocabItemDocument,
} from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import { VOCAB_WORD_LIST_DEFAULT_PAGE_SIZE } from '@/modules/vocabulary/constants'
import type {
  VocabUserItemStatus,
  VocabWordListPageRecord,
  VocabWordListView,
  VocabWordSourceVideoRecord,
} from '@/modules/vocabulary/types'
import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import { toUserVocabItemRecord } from './userVocabItemRecords'
import { toVocabEntryRecord } from './vocabEntryRecords'

export const VOCAB_WORD_LIST_VIEW_LABELS: Record<VocabWordListView, string> = {
  alreadyKnow: 'Already Know',
  dueToday: 'Due Today',
  knownTotal: 'Known Total',
  learning: 'Learning',
  mastered: 'Mastered',
}

export function parseVocabWordListView(
  value: string | string[] | undefined
): VocabWordListView {
  const view = Array.isArray(value) ? value[0] : value

  if (
    view === 'learning' ||
    view === 'dueToday' ||
    view === 'alreadyKnow' ||
    view === 'mastered' ||
    view === 'knownTotal'
  )
    return view

  return 'learning'
}

function getStatusFilter(
  view: VocabWordListView,
  now: Date
): QueryFilter<UserVocabItemDocument> {
  if (view === 'dueToday')
    return {
      dueAt: { $lte: now },
      status: 'learning' satisfies VocabUserItemStatus,
    }

  if (view === 'knownTotal')
    return {
      status: {
        $in: [
          'alreadyKnow' satisfies VocabUserItemStatus,
          'mastered' satisfies VocabUserItemStatus,
        ],
      },
    }

  return { status: view }
}

type SortSpec = Record<string, 1 | -1>

function getSortForView(view: VocabWordListView): SortSpec {
  if (view === 'dueToday' || view === 'learning')
    return { dueAt: 1, updatedAt: -1 }

  if (view === 'knownTotal' || view === 'alreadyKnow')
    return { knownAt: -1, updatedAt: -1 }

  return { masteredAt: -1, updatedAt: -1 }
}

/**
 * Resolve the source video for each entry from the user's most recent vocab
 * occurrence that carries a videoId. The word is looked up (recording an
 * occurrence with the current videoId) right before it is saved via
 * "Should Learn", so the latest video-bearing occurrence is the video the word
 * was learned from. Grouped in MongoDB so only one row per entry comes back,
 * not every occurrence. Returns a map keyed by stringified vocabEntryId.
 */
async function getSourceVideosByEntryId({
  entryIds,
  userId,
}: {
  entryIds: Types.ObjectId[]
  userId: string
}): Promise<Map<string, VocabWordSourceVideoRecord>> {
  if (entryIds.length === 0) return new Map()

  const latest = await VocabOccurrenceModel.aggregate<{
    _id: Types.ObjectId
    videoId: Types.ObjectId
  }>([
    {
      $match: {
        userId,
        videoId: { $ne: null },
        vocabEntryId: { $in: entryIds },
      },
    },
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$vocabEntryId', videoId: { $first: '$videoId' } } },
  ])

  if (latest.length === 0) return new Map()

  const videos = await DictationVideoModel.find({
    _id: { $in: [...new Set(latest.map(row => String(row.videoId)))] },
  })
    .select('title youtubeUrl')
    .lean()
  const videoById = new Map(
    videos.map(video => [
      String(video._id),
      {
        id: String(video._id),
        title: video.title,
        youtubeUrl: video.youtubeUrl,
      } satisfies VocabWordSourceVideoRecord,
    ])
  )

  const sourceVideoByEntryId = new Map<string, VocabWordSourceVideoRecord>()

  for (const row of latest) {
    const video = videoById.get(String(row.videoId))

    if (video) sourceVideoByEntryId.set(String(row._id), video)
  }

  return sourceVideoByEntryId
}

// Only what a word card renders: term + pronunciation, the Vietnamese meaning,
// the first English definition, rank and enrichment status. Aggregation form,
// so the definition slice is an expression.
const WORD_LIST_ENTRY_PROJECTION = {
  createdAt: 1,
  definitions: { $slice: ['$definitions', 1] },
  enrichmentStatus: 1,
  frequencyRank: 1,
  localizedMeanings: 1,
  normalizedTerm: 1,
  phonetics: 1,
  term: 1,
  updatedAt: 1,
}

export function getVocabWordListSkip({
  page,
  perPage,
}: {
  page: number
  perPage: number
}) {
  return (Math.max(page, 1) - 1) * perPage
}

/**
 * One round trip for a page of the word list and its total. The entry join and
 * the Vietnamese-meaning filter run BEFORE skip/limit, so an item whose entry
 * has no meaning yet is neither counted nor leaves a hole in the page (paging
 * first and dropping rows afterwards gave short pages, a total that counted
 * hidden words and an empty last page).
 */
export function buildVocabWordListPipeline({
  entryCollection,
  filter,
  page,
  perPage,
  view,
}: {
  entryCollection: string
  filter: Record<string, unknown>
  page: number
  perPage: number
  view: VocabWordListView
}): PipelineStage[] {
  return [
    { $match: filter },
    { $sort: { ...getSortForView(view), _id: 1 } },
    {
      $lookup: {
        from: entryCollection,
        localField: 'vocabEntryId',
        foreignField: '_id',
        pipeline: [
          { $match: VOCAB_REQUIRES_VI_MEANING_FILTER },
          { $project: WORD_LIST_ENTRY_PROJECTION },
        ],
        as: 'entry',
      },
    },
    // Drops items whose entry is missing or fails the meaning filter.
    { $unwind: '$entry' },
    {
      $facet: {
        total: [{ $count: 'count' }],
        rows: [
          { $skip: getVocabWordListSkip({ page, perPage }) },
          { $limit: perPage },
        ],
      },
    },
  ]
}

type WordListRow = UserVocabItemDocument & {
  _id: Types.ObjectId
  createdAt: Date
  entry: Parameters<typeof toVocabEntryRecord>[0]
  updatedAt: Date
}

export async function listVocabWordsForUser({
  now = new Date(),
  page = 1,
  perPage = VOCAB_WORD_LIST_DEFAULT_PAGE_SIZE,
  userId,
  view,
}: {
  now?: Date
  page?: number
  perPage?: number
  userId: string
  view: VocabWordListView
}): Promise<VocabWordListPageRecord> {
  const empty = { page, perPage, total: 0, words: [] }

  if (!userId) return empty

  const filter = { userId, ...getStatusFilter(view, now) }
  const [result] = await UserVocabItemModel.aggregate<{
    rows: WordListRow[]
    total: { count: number }[]
  }>(
    buildVocabWordListPipeline({
      entryCollection: VocabEntryModel.collection.collectionName,
      filter,
      page,
      perPage,
      view,
    })
  )
  const rows = result?.rows ?? []
  const total = result?.total[0]?.count ?? 0

  if (rows.length === 0) return { ...empty, total }

  const sourceVideoByEntryId = await getSourceVideosByEntryId({
    entryIds: rows.map(row => row.vocabEntryId),
    userId,
  })

  const words = rows.map(({ entry, ...item }) => ({
    entry: toVocabEntryRecord(entry),
    item: toUserVocabItemRecord(item),
    sourceVideo: sourceVideoByEntryId.get(String(item.vocabEntryId)) ?? null,
  }))

  return { page, perPage, total, words }
}

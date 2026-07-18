import 'server-only'

import type { QueryFilter, SortOrder, Types } from 'mongoose'

import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  UserVocabItemModel,
  type UserVocabItemDocument,
} from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import type {
  VocabUserItemStatus,
  VocabWordListRecord,
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

function getSortForView(view: VocabWordListView): [string, SortOrder][] {
  if (view === 'dueToday' || view === 'learning')
    return [
      ['dueAt', 'asc'],
      ['updatedAt', 'desc'],
    ]

  if (view === 'knownTotal' || view === 'alreadyKnow')
    return [
      ['knownAt', 'desc'],
      ['updatedAt', 'desc'],
    ]

  return [
    ['masteredAt', 'desc'],
    ['updatedAt', 'desc'],
  ]
}

/**
 * Resolve the source video for each entry from the user's most recent vocab
 * occurrence that carries a videoId. The word is looked up (recording an
 * occurrence with the current videoId) right before it is saved via
 * "Should Learn", so the latest video-bearing occurrence is the video the word
 * was learned from. Returns a map keyed by stringified vocabEntryId.
 */
async function getSourceVideosByEntryId({
  entryIds,
  userId,
}: {
  entryIds: Types.ObjectId[]
  userId: string
}): Promise<Map<string, VocabWordSourceVideoRecord>> {
  if (entryIds.length === 0) return new Map()

  const occurrences = await VocabOccurrenceModel.find({
    userId,
    vocabEntryId: { $in: entryIds },
    videoId: { $ne: null },
  })
    .sort({ createdAt: -1 })
    .select('vocabEntryId videoId')
    .lean()

  // First occurrence per entry wins (sorted newest first).
  const videoIdByEntryId = new Map<string, string>()

  for (const occurrence of occurrences) {
    const entryKey = String(occurrence.vocabEntryId)

    if (!videoIdByEntryId.has(entryKey))
      videoIdByEntryId.set(entryKey, String(occurrence.videoId))
  }

  if (videoIdByEntryId.size === 0) return new Map()

  const videos = await DictationVideoModel.find({
    _id: { $in: [...new Set(videoIdByEntryId.values())] },
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

  for (const [entryKey, videoId] of videoIdByEntryId) {
    const video = videoById.get(videoId)

    if (video) sourceVideoByEntryId.set(entryKey, video)
  }

  return sourceVideoByEntryId
}

export async function listVocabWordsForUser({
  now = new Date(),
  userId,
  view,
}: {
  now?: Date
  userId: string
  view: VocabWordListView
}): Promise<VocabWordListRecord[]> {
  if (!userId) return []

  const items = await UserVocabItemModel.find({
    userId,
    ...getStatusFilter(view, now),
  })
    .sort(getSortForView(view))
    .lean()

  if (items.length === 0) return []

  const entryIds = items.map(item => item.vocabEntryId)
  const [entries, sourceVideoByEntryId] = await Promise.all([
    VocabEntryModel.find({
      _id: { $in: entryIds },
      ...VOCAB_REQUIRES_VI_MEANING_FILTER,
    }).lean(),
    getSourceVideosByEntryId({ entryIds, userId }),
  ])
  const entryById = new Map(entries.map(entry => [String(entry._id), entry]))

  return items.flatMap(item => {
    const entry = entryById.get(String(item.vocabEntryId))
    if (!entry) return []

    return [
      {
        entry: toVocabEntryRecord(entry),
        item: toUserVocabItemRecord(item),
        sourceVideo: sourceVideoByEntryId.get(String(item.vocabEntryId)) ?? null,
      },
    ]
  })
}

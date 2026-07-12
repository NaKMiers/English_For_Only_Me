import 'server-only'

import type { QueryFilter, SortOrder } from 'mongoose'

import {
  UserVocabItemModel,
  type UserVocabItemDocument,
} from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import type {
  VocabUserItemStatus,
  VocabWordListRecord,
  VocabWordListView,
} from '@/modules/vocabulary/types'

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

  const entries = await VocabEntryModel.find({
    _id: { $in: items.map(item => item.vocabEntryId) },
  }).lean()
  const entryById = new Map(entries.map(entry => [String(entry._id), entry]))

  return items.flatMap(item => {
    const entry = entryById.get(String(item.vocabEntryId))
    if (!entry) return []

    return [
      {
        entry: toVocabEntryRecord(entry),
        item: toUserVocabItemRecord(item),
      },
    ]
  })
}

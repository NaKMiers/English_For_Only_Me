import 'server-only'

import { Types } from 'mongoose'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import {
  getAlreadyKnownState,
  getInitialLearningState,
  applyRecallAnswer,
} from '@/modules/vocabulary/recall/recallScheduler'
import type {
  UserVocabItemApiRecord,
  VocabLearningSource,
  VocabOccurrenceReason,
  VocabRecallCardRecord,
} from '@/modules/vocabulary/types'
import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import { toUserVocabItemRecord } from './userVocabItemRecords'
import { toVocabEntryRecord } from './vocabEntryRecords'
import { toVocabOccurrenceRecord } from './vocabOccurrenceRecords'

export interface RecordOccurrenceInput {
  attemptId?: string | null
  contextSentence?: string | null
  reason: VocabOccurrenceReason
  segmentId?: string | null
  selectedText?: string | null
  userId: string
  videoId?: string | null
  vocabEntryId: string
}

class MissingVietnameseMeaningError extends Error {
  status = 409 as const

  constructor() {
    super(
      'This vocabulary entry needs a Vietnamese meaning before it can be learned.'
    )
  }
}

function toObjectIdOrNull(id: string | null | undefined) {
  return id ? new Types.ObjectId(id) : null
}

export async function recordVocabOccurrence(input: RecordOccurrenceInput) {
  const occurrence = await VocabOccurrenceModel.create({
    attemptId: toObjectIdOrNull(input.attemptId),
    contextSentence: input.contextSentence?.trim() || null,
    reason: input.reason,
    segmentId: toObjectIdOrNull(input.segmentId),
    selectedText: input.selectedText?.trim() || null,
    userId: input.userId,
    videoId: toObjectIdOrNull(input.videoId),
    vocabEntryId: new Types.ObjectId(input.vocabEntryId),
  })

  return toVocabOccurrenceRecord(occurrence.toObject())
}

export async function setUserVocabItemStatus({
  now = new Date(),
  source,
  status,
  userId,
  vocabEntryId,
}: {
  now?: Date
  source: VocabLearningSource
  status: 'shouldLearn' | 'alreadyKnow'
  userId: string
  vocabEntryId: string
}): Promise<UserVocabItemApiRecord | null> {
  const entryExists = await VocabEntryModel.exists({
    _id: vocabEntryId,
    ...VOCAB_REQUIRES_VI_MEANING_FILTER,
  })

  if (!entryExists) throw new MissingVietnameseMeaningError()

  const existingItem = await UserVocabItemModel.findOne({
    userId,
    vocabEntryId,
  }).lean()

  if (
    existingItem &&
    status === 'shouldLearn' &&
    existingItem.status === 'learning'
  )
    return toUserVocabItemRecord(existingItem)

  const state =
    status === 'shouldLearn'
      ? getInitialLearningState(now)
      : getAlreadyKnownState(now)

  const item = await UserVocabItemModel.findOneAndUpdate(
    {
      userId,
      vocabEntryId,
    },
    {
      $set: {
        ...state,
        source,
      },
      $setOnInsert: {
        firstSeenAt: now,
        userId,
        vocabEntryId: new Types.ObjectId(vocabEntryId),
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
    }
  )

  return item ? toUserVocabItemRecord(item.toObject()) : null
}

export interface VocabItemStatusBatchResult {
  vocabEntryId: string
  item: UserVocabItemApiRecord | null
  error?: string
}

/**
 * Apply many status updates in one request. Each update is independent: a single
 * bad entry (e.g. missing Vietnamese meaning) is reported per-item instead of
 * failing the whole batch, so the client can reconcile/roll back exactly the
 * entries that failed. Reuses a single `now` so a burst of presses shares one
 * timestamp.
 */
export async function setUserVocabItemStatusBatch({
  now = new Date(),
  updates,
  userId,
}: {
  now?: Date
  updates: Array<{
    source: VocabLearningSource
    status: 'shouldLearn' | 'alreadyKnow'
    vocabEntryId: string
  }>
  userId: string
}): Promise<VocabItemStatusBatchResult[]> {
  return Promise.all(
    updates.map(async update => {
      try {
        const item = await setUserVocabItemStatus({
          now,
          source: update.source,
          status: update.status,
          userId,
          vocabEntryId: update.vocabEntryId,
        })

        return { item, vocabEntryId: update.vocabEntryId }
      } catch (error) {
        return {
          error:
            error instanceof Error
              ? error.message
              : 'Could not update this word.',
          item: null,
          vocabEntryId: update.vocabEntryId,
        }
      }
    })
  )
}

export async function listDueVocabRecallCardsForUser({
  limit,
  now = new Date(),
  userId,
}: {
  limit: number
  now?: Date
  userId: string
}): Promise<VocabRecallCardRecord[]> {
  const items = await UserVocabItemModel.find({
    dueAt: { $lte: now },
    status: 'learning',
    userId,
  })
    .sort({ dueAt: 1, updatedAt: 1 })
    .limit(limit)
    .lean()

  if (items.length === 0) return []

  const entries = await VocabEntryModel.find({
    _id: { $in: items.map(item => item.vocabEntryId) },
    ...VOCAB_REQUIRES_VI_MEANING_FILTER,
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

export async function answerVocabRecallForUser({
  isCorrect,
  itemId,
  now = new Date(),
  userId,
}: {
  isCorrect: boolean
  itemId: string
  now?: Date
  userId: string
}) {
  const item = await UserVocabItemModel.findOne({
    _id: itemId,
    status: 'learning',
    userId,
  }).lean()

  if (!item) return null

  const patch = applyRecallAnswer({
    isCorrect,
    item: toUserVocabItemRecord(item),
    now,
  })

  const updated = await UserVocabItemModel.findOneAndUpdate(
    {
      _id: itemId,
      userId,
    },
    {
      $set: patch,
    },
    {
      returnDocument: 'after',
    }
  ).lean()

  return updated ? toUserVocabItemRecord(updated) : null
}

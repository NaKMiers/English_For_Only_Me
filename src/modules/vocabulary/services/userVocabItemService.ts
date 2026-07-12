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
  const entryExists = await VocabEntryModel.exists({ _id: vocabEntryId })

  if (!entryExists) return null

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
      new: true,
      upsert: true,
    }
  )

  return item ? toUserVocabItemRecord(item.toObject()) : null
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
      new: true,
    }
  ).lean()

  return updated ? toUserVocabItemRecord(updated) : null
}

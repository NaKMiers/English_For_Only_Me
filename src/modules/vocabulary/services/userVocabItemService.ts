import 'server-only'

import { Types } from 'mongoose'

import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import {
  getAlreadyKnownState,
  getInitialLearningState,
} from '@/modules/vocabulary/recall/recallScheduler'
import type {
  UserVocabItemApiRecord,
  VocabLearningSource,
  VocabOccurrenceReason,
} from '@/modules/vocabulary/types'
import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import { toUserVocabItemRecord } from './userVocabItemRecords'
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

export class MissingVietnameseMeaningError extends Error {
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

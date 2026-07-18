import 'server-only'

import { Types } from 'mongoose'

import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { applyRecallAnswer } from '@/modules/vocabulary/recall/recallScheduler'
import type { VocabRecallAnswerAction } from '@/modules/vocabulary/types'

import { toUserVocabItemRecord } from '../services/userVocabItemRecords'
import { verifyVocabRecallTaskToken } from './recallTaskToken'

export interface SubmitVocabRecallAnswerInput {
  action?: VocabRecallAnswerAction | null
  idempotencyKey: string
  now?: Date
  selectedOptionId?: string | null
  token: string
  userId: string
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}

function gradeAnswer({
  action,
  correctOptionId,
  selectedOptionId,
}: {
  action?: VocabRecallAnswerAction | null
  correctOptionId: string | null
  selectedOptionId?: string | null
}) {
  if (!correctOptionId) return action === 'remember'

  return selectedOptionId === correctOptionId
}

export async function submitVocabRecallAnswerForUser({
  action = null,
  idempotencyKey,
  now = new Date(),
  selectedOptionId = null,
  token,
  userId,
}: SubmitVocabRecallAnswerInput) {
  const payload = verifyVocabRecallTaskToken({ now, token, userId })

  if (!payload) return null

  const previousAttempt = await VocabRecallAttemptModel.findOne({
    idempotencyKey,
    userId,
  }).lean()

  if (previousAttempt) {
    const item = await UserVocabItemModel.findOne({
      _id: previousAttempt.itemId,
      userId,
    }).lean()

    return item
      ? {
          attemptId: String(previousAttempt._id),
          isCorrect: previousAttempt.isCorrect,
          item: toUserVocabItemRecord(item),
        }
      : null
  }

  const item = await UserVocabItemModel.findOne({
    _id: payload.itemId,
    dueAt: { $lte: now },
    recallStage: payload.recallStage,
    status: 'learning',
    userId,
    vocabEntryId: payload.entryId,
  }).lean()

  if (!item) return null

  const currentItem = toUserVocabItemRecord(item)
  const isCorrect = gradeAnswer({
    action,
    correctOptionId: payload.correctOptionId,
    selectedOptionId,
  })
  const patch = applyRecallAnswer({
    isCorrect,
    item: currentItem,
    now,
  })

  const updated = await UserVocabItemModel.findOneAndUpdate(
    {
      _id: payload.itemId,
      userId,
    },
    {
      $set: patch,
    },
    {
      returnDocument: 'after',
    }
  ).lean()

  if (!updated) return null

  try {
    const attempt = await VocabRecallAttemptModel.create({
      answeredAt: now,
      correctAnswer: payload.correctAnswer,
      idempotencyKey,
      isCorrect,
      itemId: new Types.ObjectId(payload.itemId),
      recallStageAfter: patch.recallStage,
      recallStageBefore: currentItem.recallStage,
      selectedAnswer: selectedOptionId ?? action ?? null,
      statusAfter: patch.status,
      taskId: payload.taskId,
      taskType: payload.type,
      userId,
      vocabEntryId: new Types.ObjectId(payload.entryId),
    })

    return {
      attemptId: String(attempt._id),
      isCorrect,
      item: toUserVocabItemRecord(updated),
    }
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    const attempt = await VocabRecallAttemptModel.findOne({
      idempotencyKey,
      userId,
    }).lean()

    return attempt
      ? {
          attemptId: String(attempt._id),
          isCorrect: attempt.isCorrect,
          item: toUserVocabItemRecord(updated),
        }
      : null
  }
}

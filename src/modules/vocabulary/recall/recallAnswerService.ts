import 'server-only'

import { Types } from 'mongoose'

import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { gradeVocabRecallAnswer } from '@/modules/vocabulary/recall/recallTaskPayload'
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

/**
 * The saved result for an attempt that already landed under this key, or null.
 * A replay reads as saved even when the item has since moved on.
 */
async function findSavedAttemptResult(idempotencyKey: string, userId: string) {
  const attempt = await VocabRecallAttemptModel.findOne({
    idempotencyKey,
    userId,
  }).lean()

  if (!attempt) return null

  const item = await UserVocabItemModel.findOne({
    _id: attempt.itemId,
    userId,
  }).lean()

  return item
    ? {
        attemptId: String(attempt._id),
        isCorrect: attempt.isCorrect,
        item: toUserVocabItemRecord(item),
      }
    : null
}

export async function submitVocabRecallAnswerForUser({
  action = null,
  idempotencyKey,
  now = new Date(),
  selectedOptionId = null,
  token,
  userId,
}: SubmitVocabRecallAnswerInput) {
  // Replays are answered before the token is checked: the browser queues an
  // answer and may resend it after the 30-minute token expired, and an attempt
  // that already landed must still read as saved, not stale.
  const previousAttempt = await findSavedAttemptResult(idempotencyKey, userId)

  if (previousAttempt) return previousAttempt

  // Tokens are signed for their owner, so one minted for another user (or
  // signed the old way, with the id in the payload) fails here as stale.
  const payload = verifyVocabRecallTaskToken({ now, token, userId })

  if (!payload) return null

  // Everything that makes this card still answerable. The same conditions
  // guard the write below, so the read and the write cannot race apart.
  const dueFilter = {
    _id: payload.itemId,
    dueAt: { $lte: now },
    recallStage: payload.recallStage,
    status: 'learning' as const,
    userId,
    vocabEntryId: payload.entryId,
  }
  const item = await UserVocabItemModel.findOne(dueFilter).lean()

  // A duplicate of an answer still in flight can land here after the first
  // copy moved the item on: by the time this read misses, that attempt exists
  // (it is written before the item moves), so answer with it instead of
  // reporting a saved answer as "not saved".
  if (!item) return findSavedAttemptResult(idempotencyKey, userId)

  const currentItem = toUserVocabItemRecord(item)
  const isCorrect = gradeVocabRecallAnswer({
    action,
    correctOptionId: payload.correctOptionId,
    selectedOptionId,
  })
  const patch = applyRecallAnswer({
    isCorrect,
    item: currentItem,
    now,
  })

  // Claim the idempotency key first: the unique {userId, idempotencyKey}
  // index is the lock, so a duplicate of this answer replays the winner's
  // attempt instead of applying the ladder step twice. If the request dies
  // between this insert and the item update, the retry reads as saved while
  // the item stays where it was: still due, so the card simply comes back in
  // the next session. A replay must not repair it, because the first request
  // may still be about to apply it (and would then remove its claim).
  let attemptId: string

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

    attemptId = String(attempt._id)
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    return findSavedAttemptResult(idempotencyKey, userId)
  }

  // Compare-and-set: only apply the patch to the exact state it was computed
  // from. `reviewCount` moves on every answer (a wrong answer at stage 1 keeps
  // the stage and stays due), so a second task for the same item cannot also
  // apply. Older items may not store the counter yet, which reads as 0.
  const updated = await UserVocabItemModel.findOneAndUpdate(
    {
      ...dueFilter,
      reviewCount:
        currentItem.reviewCount === 0
          ? { $in: [0, null] }
          : currentItem.reviewCount,
    },
    {
      $set: patch,
    },
    {
      returnDocument: 'after',
    }
  ).lean()

  if (!updated) {
    // Another answer moved the item first: this one did not apply, so drop
    // its claim and report the card as not saved.
    await VocabRecallAttemptModel.deleteOne({ _id: attemptId, userId })

    return null
  }

  return {
    attemptId,
    isCorrect,
    item: toUserVocabItemRecord(updated),
  }
}

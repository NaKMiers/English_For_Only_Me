import 'server-only'

import { Types } from 'mongoose'

import { isGuestId } from '@/lib/auth/guestUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabOccurrenceModel } from '@/models/vocabulary/VocabOccurrenceModel'
import { VocabRecallAttemptModel } from '@/models/vocabulary/VocabRecallAttemptModel'

import { planVocabGuestMerge, type VocabMergeItem } from './planVocabGuestMerge'

const ITEM_FIELDS = {
  correctCount: 1,
  firstSeenAt: 1,
  lastReviewedAt: 1,
  reviewCount: 1,
  vocabEntryId: 1,
  wrongCount: 1,
} as const

interface ItemRow {
  _id: Types.ObjectId
  correctCount: number
  firstSeenAt: Date
  lastReviewedAt?: Date | null
  reviewCount: number
  vocabEntryId: Types.ObjectId
  wrongCount: number
}

function toMergeItem(row: ItemRow): VocabMergeItem {
  return {
    correctCount: row.correctCount,
    firstSeenAt: row.firstSeenAt,
    id: String(row._id),
    lastReviewedAt: row.lastReviewedAt ?? null,
    reviewCount: row.reviewCount,
    vocabEntryId: String(row.vocabEntryId),
    wrongCount: row.wrongCount,
  }
}

/**
 * Fold a guest's vocabulary (word marks, recall schedule, recall attempts and
 * look-up trail) into the account on sign-in. Called from `foldGuestIntoUser`
 * next to the other modules; a failure is logged there and retried on the
 * account's next sign-in, so every step is safe to run twice.
 */
export async function mergeVocabGuestData(guestId: string, userId: string) {
  if (!isGuestId(guestId) || guestId === userId) return

  await connectDatabase()

  const [guestRows, userRows] = await Promise.all([
    UserVocabItemModel.find({ userId: guestId }, ITEM_FIELDS).lean<ItemRow[]>(),
    UserVocabItemModel.find({ userId }, ITEM_FIELDS).lean<ItemRow[]>(),
  ])
  const plan = planVocabGuestMerge(
    guestRows.map(toMergeItem),
    userRows.map(toMergeItem)
  )

  // Shared words: the user's item absorbs the guest's counts, the guest's
  // attempts follow it, then the guest's duplicate item goes.
  for (const combine of plan.combine) {
    const guestItemId = new Types.ObjectId(combine.guestItemId)
    const userItemId = new Types.ObjectId(combine.userItemId)

    await UserVocabItemModel.updateOne(
      { _id: userItemId, userId },
      { $set: combine.update }
    )
    await VocabRecallAttemptModel.updateMany(
      { itemId: guestItemId, userId: guestId },
      { $set: { itemId: userItemId } }
    )
    await UserVocabItemModel.deleteOne({ _id: guestItemId, userId: guestId })
  }

  if (plan.move.length > 0)
    await UserVocabItemModel.updateMany(
      {
        _id: { $in: plan.move.map(id => new Types.ObjectId(id)) },
        userId: guestId,
      },
      { $set: { userId } }
    )

  // Recall attempts are unique per (userId, idempotencyKey). A key the user
  // already has is the same answer replayed under both owners: keep the
  // user's copy and drop the guest's.
  const guestKeys = await VocabRecallAttemptModel.distinct('idempotencyKey', {
    userId: guestId,
  })

  if (guestKeys.length > 0) {
    const clashing = await VocabRecallAttemptModel.distinct('idempotencyKey', {
      idempotencyKey: { $in: guestKeys },
      userId,
    })

    if (clashing.length > 0)
      await VocabRecallAttemptModel.deleteMany({
        idempotencyKey: { $in: clashing },
        userId: guestId,
      })

    await VocabRecallAttemptModel.updateMany(
      { userId: guestId },
      { $set: { userId } }
    )
  }

  await VocabOccurrenceModel.updateMany(
    { userId: guestId },
    { $set: { userId } }
  )

  const moved = plan.move.length + plan.combine.length

  if (moved > 0)
    console.info(
      `Merged guest vocabulary ${guestId} -> user ${userId}: ` +
        `${plan.move.length} moved, ${plan.combine.length} combined`
    )
}

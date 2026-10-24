import 'server-only'

import type { Types } from 'mongoose'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { isGuestId } from '@/lib/auth/guestUser'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import type { DictationReviewItemStatus } from '@/modules/dictation/types'

const ACTIVE_REVIEW_STATUSES: DictationReviewItemStatus[] = ['due', 'scheduled']

interface ReviewItemKey {
  _id: Types.ObjectId
  kind: string
  reason: string
  segmentId: Types.ObjectId
}

function toReviewItemKey(item: ReviewItemKey) {
  return `${String(item.segmentId)}:${item.kind}:${item.reason}`
}

/**
 * The guest's active review items that the user already has an active twin
 * of. Moving them as-is would break the partial unique index (or, before it is
 * built, leave the user with two copies of one item), so they are marked
 * dismissed - kept as history, never deleted.
 */
async function dismissCollidingGuestReviewItems(
  guestId: string,
  userId: string
) {
  const projection = { _id: 1, kind: 1, reason: 1, segmentId: 1 }
  const guestItems = await DictationReviewItemModel.find({
    userId: guestId,
    status: { $in: ACTIVE_REVIEW_STATUSES },
  })
    .select(projection)
    .lean<ReviewItemKey[]>()

  if (guestItems.length === 0) return

  const userItems = await DictationReviewItemModel.find({
    userId,
    segmentId: { $in: guestItems.map(item => item.segmentId) },
    status: { $in: ACTIVE_REVIEW_STATUSES },
  })
    .select(projection)
    .lean<ReviewItemKey[]>()
  const userKeys = new Set(userItems.map(toReviewItemKey))
  const collidingIds = guestItems
    .filter(item => userKeys.has(toReviewItemKey(item)))
    .map(item => item._id)

  if (collidingIds.length === 0) return

  await DictationReviewItemModel.updateMany(
    { _id: { $in: collidingIds }, userId: guestId },
    { $set: { status: 'dismissed' } }
  )
}

/**
 * Reassign all practice data created under a guest id to a real user id on
 * first sign-in. Best-effort: a failure here must never block login, so the
 * caller wraps this and we swallow errors after logging.
 *
 * Only collision-safe collections are merged. Attempts are safe because their
 * unique index is `{ userId, sessionId, idempotencyKey }` and the guest's
 * sessionIds are unique ObjectIds the real user cannot already own. Favorites
 * are intentionally excluded - favoriting requires login, so a guest never
 * creates any, and their unique `{ userId, videoId }` index would otherwise
 * risk a merge collision.
 *
 * Review items carry a partial unique index on active items (one per user,
 * segment, kind and reason), so a guest's active item that duplicates one the
 * user already has is dismissed before the move instead of failing it.
 */
export async function mergeGuestDataIntoUser(
  guestId: string,
  userId: string
): Promise<void> {
  if (!isGuestId(guestId) || guestId === userId) return

  await connectDatabase()

  const set = { $set: { userId } }

  await dismissCollidingGuestReviewItems(guestId, userId)

  const [sessions, attempts, reviewItems, debriefs] = await Promise.all([
    DictationSessionModel.updateMany({ userId: guestId }, set),
    DictationAttemptModel.updateMany({ userId: guestId }, set),
    DictationReviewItemModel.updateMany({ userId: guestId }, set),
    DictationDebriefModel.updateMany({ userId: guestId }, set),
  ])

  const moved =
    sessions.modifiedCount +
    attempts.modifiedCount +
    reviewItems.modifiedCount +
    debriefs.modifiedCount

  // Audit trail: on a shared device this folds one guest's practice into whoever
  // signs in. Logging the volume makes an unexpected cross-account absorption
  // visible instead of silent.
  if (moved > 0)
    console.info(
      `Merged guest practice ${guestId} -> user ${userId}: ` +
        `${sessions.modifiedCount} sessions, ${attempts.modifiedCount} attempts, ` +
        `${reviewItems.modifiedCount} review items, ${debriefs.modifiedCount} debriefs`
    )
}

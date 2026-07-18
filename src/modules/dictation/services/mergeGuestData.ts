import 'server-only'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { isGuestId } from '@/lib/auth/guestUser'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationDebriefModel } from '@/models/dictation/DictationDebriefModel'
import { DictationReviewItemModel } from '@/models/dictation/DictationReviewItemModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'

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
 */
export async function mergeGuestDataIntoUser(
  guestId: string,
  userId: string
): Promise<void> {
  if (!isGuestId(guestId) || guestId === userId) return

  await connectDatabase()

  const set = { $set: { userId } }

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

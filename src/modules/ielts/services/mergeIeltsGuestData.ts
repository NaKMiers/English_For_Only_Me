import 'server-only'

import { isGuestId } from '@/lib/auth/guestUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { IeltsAttemptModel } from '@/models/ielts/IeltsAttemptModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'

/**
 * Move a guest's IELTS attempts to the account they just signed in to.
 * Attempts are self-contained, so a move is all it takes. An attempt whose
 * idempotency key the user already has (the same request replayed under
 * both owners) stays with the guest instead of failing the whole merge.
 */
export async function mergeIeltsGuestData(guestId: string, userId: string) {
  if (!isGuestId(guestId) || guestId === userId) return

  await connectDatabase()

  try {
    await IeltsAttemptModel.updateMany(
      { ownerId: guestId },
      { $set: { ownerId: userId } }
    )
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error

    // Fall back to one by one so only the clashing attempt is left behind.
    const rows = await IeltsAttemptModel.find(
      { ownerId: guestId },
      { _id: 1 }
    ).lean()

    for (const row of rows)
      await IeltsAttemptModel.updateOne(
        { _id: row._id, ownerId: guestId },
        { $set: { ownerId: userId } }
      ).catch(rowError => {
        if (!isDuplicateKeyError(rowError)) throw rowError
      })
  }
}

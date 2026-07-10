import 'server-only'

import { DictationFavoriteModel } from '@/models/dictation/DictationFavoriteModel'

/**
 * Add a favorite (idempotent via the unique {userId, videoId} index). Returns
 * true if newly created, false if it already existed.
 */
export async function addFavorite(userId: string, videoId: string) {
  try {
    const result = await DictationFavoriteModel.updateOne(
      { userId, videoId },
      { $setOnInsert: { userId, videoId } },
      { upsert: true }
    )

    return (result.upsertedCount ?? 0) > 0
  } catch (error) {
    // Concurrent upserts can race the unique {userId, videoId} index (rapid
    // double-click). A duplicate key means it is already favorited — idempotent.
    if ((error as { code?: number }).code === 11000) return false

    throw error
  }
}

/** Remove a favorite. Returns true if a row was removed. */
export async function removeFavorite(userId: string, videoId: string) {
  const result = await DictationFavoriteModel.deleteOne({ userId, videoId })

  return (result.deletedCount ?? 0) > 0
}

/** Toggle a favorite; returns the resulting state. */
export async function toggleFavorite(userId: string, videoId: string) {
  const existing = await DictationFavoriteModel.findOne({
    userId,
    videoId,
  }).lean()

  if (existing) {
    await removeFavorite(userId, videoId)
    return { favorited: false }
  }

  await addFavorite(userId, videoId)
  return { favorited: true }
}

/** The set of video ids this user has favorited (for badging lists). */
export async function listFavoriteVideoIds(userId: string): Promise<string[]> {
  const rows = await DictationFavoriteModel.find({ userId })
    .select({ videoId: 1 })
    .lean<Array<{ videoId: unknown }>>()

  return rows.map(row => String(row.videoId))
}

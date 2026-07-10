import 'server-only'

import { DictationFavoriteModel } from '@/models/dictation/DictationFavoriteModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

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

/**
 * The user's favorited videos (non-archived), most-recently-favorited first.
 * For the favorites page.
 */
export async function listFavoriteVideosForUser(
  userId: string
): Promise<DictationVideoApiRecord[]> {
  const favorites = await DictationFavoriteModel.find({ userId })
    .sort({ createdAt: -1 })
    .lean<Array<{ videoId: unknown }>>()

  const orderedIds = favorites.map(favorite => String(favorite.videoId))
  if (orderedIds.length === 0) return []

  const videos = await DictationVideoModel.find({
    _id: { $in: orderedIds },
    status: { $ne: 'archived' },
  }).lean()

  const byId = new Map(
    videos.map(video => [String(video._id), toDictationVideoRecord(video)])
  )

  // Preserve favorite recency order; drop any archived/missing videos.
  return orderedIds
    .map(id => byId.get(id))
    .filter((video): video is DictationVideoApiRecord => Boolean(video))
}

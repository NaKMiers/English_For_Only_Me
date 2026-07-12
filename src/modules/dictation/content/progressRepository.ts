import 'server-only'

import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'

/**
 * How many times each video has been completed, keyed by video id. A
 * completion is one session with status 'completed' - starting practice again
 * after finishing opens a new session, so counting sessions counts replays.
 * Per-user data is keyed by the authenticated user's id (or guest id).
 */
export async function getCompletionCountsForUser(
  userId: string
): Promise<Map<string, number>> {
  const rows = await DictationSessionModel.aggregate<{
    _id: unknown
    count: number
  }>([
    { $match: { userId, status: 'completed' } },
    { $group: { _id: '$videoId', count: { $sum: 1 } } },
  ])

  return new Map(rows.map(row => [String(row._id), row.count]))
}

/** Completion count for a single video, for the practice page header. */
export async function getCompletionCountForVideo(
  userId: string,
  videoId: string
): Promise<number> {
  return DictationSessionModel.countDocuments({
    userId,
    videoId,
    status: 'completed',
  })
}

/** Latest completed video for the current user, used as a prominent results CTA. */
export async function getLatestCompletedVideoForUser(
  userId: string
): Promise<DictationVideoApiRecord | null> {
  const session = await DictationSessionModel.findOne({
    userId,
    status: 'completed',
  })
    .sort({ completedAt: -1, updatedAt: -1 })
    .lean<{ videoId: unknown } | null>()

  if (!session) return null

  const video = await DictationVideoModel.findOne({
    _id: session.videoId,
    status: { $ne: 'archived' },
  }).lean()

  return video ? toDictationVideoRecord(video) : null
}

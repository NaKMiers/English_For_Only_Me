import 'server-only'

import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import type {
  DictationVideoApiRecord,
  DictationVideoProgress,
} from '@/modules/dictation/types'

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

/**
 * Video ids that currently have an unfinished (active) session for this user.
 * A video is "in progress" the moment practice starts and stops being so once
 * the session completes. Used to label browse cards "Continue".
 */
export async function getInProgressVideoIdsForUser(
  userId: string
): Promise<Set<string>> {
  const rows = await DictationSessionModel.aggregate<{ _id: unknown }>([
    { $match: { userId, status: 'active' } },
    { $group: { _id: '$videoId' } },
  ])

  return new Set(rows.map(row => String(row._id)))
}

/**
 * Videos with an unfinished (active) session for this user, most recently
 * practiced first. Powers the "In Progress" resume section on the dictation
 * landing page. Archived videos are dropped.
 */
export async function listInProgressVideosForUser(
  userId: string
): Promise<DictationVideoApiRecord[]> {
  const sessions = await DictationSessionModel.find({
    userId,
    status: 'active',
  })
    .sort({ lastActiveAt: -1 })
    .select({ videoId: 1 })
    .lean<{ videoId: unknown }[]>()

  // One video can have several active sessions; keep the first (most recent).
  const orderedIds: string[] = []
  const seen = new Set<string>()

  for (const session of sessions) {
    const id = String(session.videoId)

    if (seen.has(id)) continue

    seen.add(id)
    orderedIds.push(id)
  }

  if (orderedIds.length === 0) return []

  const videos = await DictationVideoModel.find({
    _id: { $in: orderedIds },
    status: { $ne: 'archived' },
  }).lean()
  const byId = new Map(
    videos.map(video => [String(video._id), toDictationVideoRecord(video)])
  )

  return orderedIds
    .map(id => byId.get(id))
    .filter((video): video is DictationVideoApiRecord => Boolean(video))
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

/**
 * This user's tri-state progress on one video, derived from their sessions.
 * An active (unfinished) session wins, so a completed-then-restarted video
 * reads 'inProgress' until the new pass finishes. This is the single per-user
 * "completed" source of truth for the results page and its helpers.
 */
export async function getVideoProgressForUser({
  userId,
  videoId,
}: {
  userId: string
  videoId: string
}): Promise<DictationVideoProgress> {
  if (!userId) return 'notStarted'

  const activeSession = await DictationSessionModel.exists({
    status: 'active',
    userId,
    videoId,
  })

  if (activeSession) return 'inProgress'

  const completedSession = await DictationSessionModel.exists({
    status: 'completed',
    userId,
    videoId,
  })

  return completedSession ? 'completed' : 'notStarted'
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

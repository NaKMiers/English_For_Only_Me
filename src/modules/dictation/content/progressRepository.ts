import 'server-only'

import type { Types } from 'mongoose'

import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import type {
  DictationVideoApiRecord,
  DictationVideoProgress,
} from '@/modules/dictation/types'

/**
 * The active sessions this user has actually *started practicing* - an active
 * session with at least one attempt (a check/skip/reveal). Opening the practice
 * page creates an active session immediately, but a video only counts as "in
 * progress" once the user has typed and submitted at least once (product rule),
 * so an active session with zero attempts does not qualify. Ordered most
 * recently active first.
 */
async function listStartedActiveSessions(
  userId: string
): Promise<{ id: string; videoId: string }[]> {
  const sessions = await DictationSessionModel.find({
    userId,
    status: 'active',
  })
    .sort({ lastActiveAt: -1 })
    .select({ videoId: 1 })
    .lean<{ _id: Types.ObjectId; videoId: Types.ObjectId }[]>()

  if (sessions.length === 0) return []

  // Which of those sessions have any attempt? distinct keeps this to one query.
  const startedIds = new Set(
    (
      await DictationAttemptModel.distinct('sessionId', {
        userId,
        sessionId: { $in: sessions.map(session => session._id) },
      })
    ).map(id => String(id))
  )

  return sessions
    .filter(session => startedIds.has(String(session._id)))
    .map(session => ({
      id: String(session._id),
      videoId: String(session.videoId),
    }))
}

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
 * Video ids the user has started practicing (an active session with at least
 * one attempt) and not yet finished. Used to label browse cards "Continue".
 * Merely opening a video does not qualify - see listStartedActiveSessions.
 */
export async function getInProgressVideoIdsForUser(
  userId: string
): Promise<Set<string>> {
  const sessions = await listStartedActiveSessions(userId)

  return new Set(sessions.map(session => session.videoId))
}

/**
 * Videos the user has started practicing (an active session with at least one
 * attempt) and not yet finished, most recently practiced first. Powers the "In
 * Progress" resume section on the dictation landing page. A freshly-opened video
 * with no attempts is excluded. Archived videos are dropped.
 */
export async function listInProgressVideosForUser(
  userId: string
): Promise<DictationVideoApiRecord[]> {
  const sessions = await listStartedActiveSessions(userId)

  // One video can have several active sessions; keep the first (most recent).
  const orderedIds: string[] = []
  const seen = new Set<string>()

  for (const session of sessions) {
    const id = session.videoId

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
 * A *started* active session (one with at least one attempt) wins, so a
 * completed-then-restarted video reads 'inProgress' only once the new pass has a
 * submitted attempt - opening it again alone keeps the prior 'completed'. This
 * is the single per-user "completed" source of truth for the results page.
 */
export async function getVideoProgressForUser({
  userId,
  videoId,
}: {
  userId: string | null
  videoId: string
}): Promise<DictationVideoProgress> {
  if (!userId) return 'notStarted'

  const activeSession = await DictationSessionModel.findOne({
    status: 'active',
    userId,
    videoId,
  })
    .select({ _id: 1 })
    .lean<{ _id: Types.ObjectId } | null>()

  if (activeSession) {
    const hasAttempt = await DictationAttemptModel.exists({
      userId,
      videoId,
      sessionId: activeSession._id,
    })

    if (hasAttempt) return 'inProgress'
  }

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

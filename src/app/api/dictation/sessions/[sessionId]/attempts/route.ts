import { Types } from 'mongoose'
import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { buildDictationCorrection } from '@/modules/dictation/correction'
import {
  canRecordAttemptForSession,
  resolveAttemptCursor,
} from '@/modules/dictation/practice/attemptCursor'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'
import {
  EMPTY_SEGMENT_PROGRESS,
  type SegmentProgressRow,
} from '@/modules/dictation/practice/segmentProgress'
import { loadSegmentProgressRows } from '@/modules/dictation/practice/segmentProgressService'
import {
  completeReviewItemsForSegment,
  recomputeReviewItemsForSegment,
} from '@/modules/dictation/review/reviewItemService'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requireUser } from '@/lib/auth/currentUser'
import { InvalidOwnerKeyError } from '@/lib/auth/ownerKey'
import {
  parseAttemptPayload,
  resolveAttemptSubmissionMode,
  shouldAdvanceAttemptCursor,
} from '@/modules/dictation/services/attemptRouteDecisions'
import type { DictationAttemptApiRecord } from '@/modules/dictation/types'
import { parseSessionIdParam } from '@/modules/dictation/services/sessionRouteDecisions'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{
    sessionId: string
  }>
}

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/** The learner's own progress on the attempted segment, for the shell. */
async function loadAttemptedSegmentProgress({
  segmentId,
  userId,
  videoId,
}: {
  segmentId: string
  userId: string
  videoId: string
}): Promise<SegmentProgressRow> {
  const [row] = await loadSegmentProgressRows({ segmentId, userId, videoId })

  return row ?? { ...EMPTY_SEGMENT_PROGRESS, segmentId }
}

/**
 * Recompute the segment's review items, then, for a passed attempt made from
 * the review queue, solve them. In that order: the recompute cannot raise the
 * item again after it is solved (attempts up to the solve are ignored).
 */
async function updateReviewItems({
  isPassed,
  review,
  segmentId,
  userId,
  videoId,
}: {
  isPassed: boolean
  review?: boolean
  segmentId: string
  userId: string
  videoId: string
}) {
  await recomputeReviewItemsForSegment({ segmentId, userId, videoId })

  if (review && isPassed)
    await completeReviewItemsForSegment({ segmentId, userId })
}

/**
 * The attempt this user already recorded under `idempotencyKey`, in any of
 * their sessions. Keys are per user: after a 404/409 the client may retry the
 * same queued attempt against a fresh session, and that must replay the
 * original instead of recording it twice. The oldest wins if historical data
 * holds the key twice.
 */
async function findAttemptByIdempotencyKey({
  idempotencyKey,
  userId,
}: {
  idempotencyKey: string
  userId: string
}) {
  return DictationAttemptModel.findOne({ userId, idempotencyKey })
    .sort({ createdAt: 1 })
    .lean()
}

/**
 * The response for an attempt that already exists. The cursor is left alone,
 * but review items are recomputed: if the first delivery saved the attempt and
 * then failed (session save or recompute threw, so the client saw a 500), the
 * retry lands here and is the only chance to create that attempt's review
 * item. The recompute is idempotent, and a race with a still-running first
 * delivery ends in E11000 on the active-item unique index, which it tolerates.
 *
 * The session is the one the request targets (a retry may come through a newer
 * session than the attempt's own), still scoped to the user.
 */
async function respondWithReplay({
  attempt,
  review,
  sessionId,
  userId,
}: {
  attempt: DictationAttemptApiRecord
  review?: boolean
  sessionId: string
  userId: string
}) {
  const t = await getMessages()
  const [session, progress] = await Promise.all([
    DictationSessionModel.findOne({ _id: sessionId, userId }).lean(),
    loadAttemptedSegmentProgress({
      segmentId: attempt.segmentId,
      userId,
      videoId: attempt.videoId,
    }),
    updateReviewItems({
      isPassed: attempt.isPassed,
      review,
      segmentId: attempt.segmentId,
      userId,
      videoId: attempt.videoId,
    }),
  ])

  if (!session)
    return jsonError({
      status: 404,
      body: {
        message: t.dictation.api.sessionNotFound,
      },
    })

  return NextResponse.json({
    attempt,
    mode: 'idempotent' as const,
    nextSegmentId: session.currentSegmentId
      ? String(session.currentSegmentId)
      : null,
    progress,
    session: toDictationSessionRecord(session),
  })
}

function toAttemptError(error: unknown, t: Messages): ApiErrorDecision {
  // A session whose id is not an ObjectId (see ownerKey.ts).
  if (error instanceof InvalidOwnerKeyError)
    return {
      status: 400,
      body: {
        message: t.common.errors.invalidRequest,
      },
    }

  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: getAccessErrorMessage(error.status, t),
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to save dictation attempt', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.attemptSaveFailed,
    },
  }
}

export async function POST(request: Request, context: RouteContext) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsedSessionId = parseSessionIdParam(params.sessionId)

  if (!parsedSessionId.ok) return jsonError(parsedSessionId)

  try {
    const body = await request.json()
    const parsedBody = parseAttemptPayload(body)

    if (!parsedBody.ok) return jsonError(parsedBody)

    const user = await requireUser()

    await connectDatabase()

    const existingAttempt = await findAttemptByIdempotencyKey({
      idempotencyKey: parsedBody.data.idempotencyKey,
      userId: user.id,
    })
    const submissionMode = resolveAttemptSubmissionMode(
      existingAttempt ? toDictationAttemptRecord(existingAttempt) : null
    )

    // Replay (a retried outbox item, a second tab, or a retry through a newer
    // session): the attempt already exists, so it is not recorded twice and
    // the cursor is left alone.
    if (submissionMode.attempt)
      return respondWithReplay({
        attempt: submissionMode.attempt,
        review: parsedBody.data.review,
        sessionId: parsedSessionId.data.sessionId,
        userId: user.id,
      })

    const session = await DictationSessionModel.findOne({
      _id: parsedSessionId.data.sessionId,
      userId: user.id,
    })

    if (!session)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.sessionNotFound,
        },
      })

    // A review attempt never touches the session (position, status), so it
    // may land in the session that recorded the sentence's earlier attempts,
    // whatever its status now.
    if (!parsedBody.data.review && !canRecordAttemptForSession(session.status))
      return jsonError({
        status: 409,
        body: {
          message: t.dictation.api.sessionNotActive,
        },
      })

    // Any segment of the session's own transcript is accepted: the browser
    // grades locally and queues attempts, so the cursor may already be
    // elsewhere when this lands. The transcript/video match is the ownership
    // check that keeps a session from recording another video's segments.
    const segment = await DictationSegmentModel.findOne({
      _id: parsedBody.data.segmentId,
      transcriptId: session.transcriptId,
      videoId: session.videoId,
    })

    if (!segment)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.segmentNotFound,
        },
      })

    const typedAnswer = parsedBody.data.typedAnswer ?? ''
    const correction = buildDictationCorrection({
      action: parsedBody.data.action,
      expectedText: segment.text,
      typedAnswer,
    })
    const now = new Date()
    const attempt = new DictationAttemptModel({
      userId: user.id,
      videoId: session.videoId,
      transcriptId: session.transcriptId,
      sessionId: session._id,
      segmentId: segment._id,
      action: parsedBody.data.action,
      idempotencyKey: parsedBody.data.idempotencyKey,
      typedAnswer,
      expectedTextSnapshot: segment.text,
      replayCountDelta: parsedBody.data.replayCountDelta,
      timeSpentMs: parsedBody.data.timeSpentMs,
      normalizedTypedTokens: correction.normalizedTyped.tokens,
      normalizedExpectedTokens: correction.normalizedExpected.tokens,
      isPassed: correction.isPassed,
      feedbackTokens: correction.feedbackTokens,
      stats: correction.stats,
    })

    try {
      await attempt.save()
    } catch (error) {
      // A concurrent duplicate (keepalive flush racing the normal send) won
      // the unique (userId, sessionId, idempotencyKey) index: answer with its
      // attempt.
      if (!isDuplicateKeyError(error)) throw error

      const winner = await findAttemptByIdempotencyKey({
        idempotencyKey: parsedBody.data.idempotencyKey,
        userId: user.id,
      })

      if (!winner) throw error

      return respondWithReplay({
        attempt: toDictationAttemptRecord(winner),
        review: parsedBody.data.review,
        sessionId: parsedSessionId.data.sessionId,
        userId: user.id,
      })
    }

    const videoId = String(session.videoId)
    const segmentId = String(segment._id)
    const reviewUpdate = {
      isPassed: correction.isPassed,
      review: parsedBody.data.review,
      segmentId,
      userId: user.id,
      videoId,
    }

    // From the review queue: record and solve, but never move the learner's
    // saved position or finish their session.
    if (parsedBody.data.review) {
      const [progress] = await Promise.all([
        loadAttemptedSegmentProgress({ segmentId, userId: user.id, videoId }),
        updateReviewItems(reviewUpdate),
      ])

      return NextResponse.json(
        {
          attempt: toDictationAttemptRecord(attempt.toObject()),
          mode: submissionMode.mode,
          nextSegmentId: null,
          progress,
          session: toDictationSessionRecord(session.toObject()),
        },
        { status: 201 }
      )
    }

    // Progress is per learner and derived from attempts (see
    // segmentProgress.ts); the shared segment document is never written here.
    const shouldAdvance = shouldAdvanceAttemptCursor({
      action: parsedBody.data.action,
      isPassed: correction.isPassed,
    })
    const nextSegment =
      shouldAdvance && session.status === 'active'
        ? await DictationSegmentModel.findOne({
            order: { $gt: segment.order },
            transcriptId: session.transcriptId,
            videoId: session.videoId,
          })
            .sort({ order: 1 })
            .select('_id order')
            .lean()
        : null
    const cursor = resolveAttemptCursor({
      attemptedSegment: { id: String(segment._id), order: segment.order },
      currentSegmentId: session.currentSegmentId
        ? String(session.currentSegmentId)
        : null,
      nextSegment: nextSegment
        ? { id: String(nextSegment._id), order: nextSegment.order }
        : null,
      sessionStatus: session.status,
      shouldAdvance,
    })

    if (cursor.type === 'move') {
      session.currentSegmentId = new Types.ObjectId(cursor.segmentId)
      session.currentSegmentOrder = cursor.order
    } else if (cursor.type === 'complete') {
      // Per-user completion only. The shared video.status is no longer
      // mutated by practice - progress is derived per-user from sessions.
      session.status = 'completed'
      session.completedAt = now
    }

    session.lastActiveAt = now

    const [, progress] = await Promise.all([
      session.save(),
      loadAttemptedSegmentProgress({ segmentId, userId: user.id, videoId }),
      updateReviewItems(reviewUpdate),
    ])

    return NextResponse.json(
      {
        attempt: toDictationAttemptRecord(attempt.toObject()),
        mode: submissionMode.mode,
        nextSegmentId:
          session.status === 'completed' || !session.currentSegmentId
            ? null
            : String(session.currentSegmentId),
        progress,
        session: toDictationSessionRecord(session.toObject()),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toAttemptError(error, t))
  }
}

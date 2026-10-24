import { Types } from 'mongoose'
import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
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
import { recomputeReviewItemsForSegment } from '@/modules/dictation/review/reviewItemService'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  parseAttemptPayload,
  resolveAttemptSubmissionMode,
  shouldAdvanceAttemptCursor,
} from '@/modules/dictation/services/attemptRouteDecisions'
import type { DictationAttemptApiRecord } from '@/modules/dictation/types'
import { parseSessionIdParam } from '@/modules/dictation/services/sessionRouteDecisions'
import {
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
  sessionId,
  userId,
}: {
  attempt: DictationAttemptApiRecord
  sessionId: string
  userId: string
}) {
  const [session, progress] = await Promise.all([
    DictationSessionModel.findOne({ _id: sessionId, userId }).lean(),
    loadAttemptedSegmentProgress({
      segmentId: attempt.segmentId,
      userId,
      videoId: attempt.videoId,
    }),
    recomputeReviewItemsForSegment({
      segmentId: attempt.segmentId,
      userId,
      videoId: attempt.videoId,
    }),
  ])

  if (!session)
    return jsonError({
      status: 404,
      body: {
        message: 'This dictation session was not found.',
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

function toAttemptError(error: unknown): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: (error as { message?: string }).message ?? 'Access denied.',
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
      message: 'Could not save this dictation attempt.',
    },
  }
}

export async function POST(request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsedSessionId = parseSessionIdParam(params.sessionId)

  if (!parsedSessionId.ok) return jsonError(parsedSessionId)

  try {
    const body = await request.json()
    const parsedBody = parseAttemptPayload(body)

    if (!parsedBody.ok) return jsonError(parsedBody)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const existingAttempt = await findAttemptByIdempotencyKey({
      idempotencyKey: parsedBody.data.idempotencyKey,
      userId: actor.id,
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
        sessionId: parsedSessionId.data.sessionId,
        userId: actor.id,
      })

    const session = await DictationSessionModel.findOne({
      _id: parsedSessionId.data.sessionId,
      userId: actor.id,
    })

    if (!session)
      return jsonError({
        status: 404,
        body: {
          message: 'This dictation session was not found.',
        },
      })

    if (!canRecordAttemptForSession(session.status))
      return jsonError({
        status: 409,
        body: {
          message: 'This dictation session is not active.',
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
          message: 'This dictation segment was not found.',
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
      userId: actor.id,
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
        userId: actor.id,
      })

      if (!winner) throw error

      return respondWithReplay({
        attempt: toDictationAttemptRecord(winner),
        sessionId: parsedSessionId.data.sessionId,
        userId: actor.id,
      })
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

    const videoId = String(session.videoId)
    const segmentId = String(segment._id)
    const [, progress] = await Promise.all([
      session.save(),
      loadAttemptedSegmentProgress({ segmentId, userId: actor.id, videoId }),
      recomputeReviewItemsForSegment({ segmentId, userId: actor.id, videoId }),
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
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toAttemptError(error))
  }
}

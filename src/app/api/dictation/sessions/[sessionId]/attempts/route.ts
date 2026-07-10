import { Types } from 'mongoose'
import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationAttemptModel } from '@/models/dictation/DictationAttemptModel'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { buildDictationCorrection } from '@/modules/dictation/correction'
import { recomputeReviewItemsForVideo } from '@/modules/dictation/review/reviewItemService'
import { toDictationAttemptRecord } from '@/modules/dictation/services/dictationAttemptRecords'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  getAttemptSegmentStatus,
  getCheckSegmentStatus,
  parseAttemptPayload,
  resolveAttemptSubmissionMode,
  shouldAdvanceAttemptCursor,
} from '@/modules/dictation/services/attemptRouteDecisions'
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

function toAttemptError(error: unknown): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403)
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

    const existingAttempt = await DictationAttemptModel.findOne({
      userId: actor.id,
      sessionId: parsedSessionId.data.sessionId,
      idempotencyKey: parsedBody.data.idempotencyKey,
    }).lean()
    const submissionMode = resolveAttemptSubmissionMode(
      existingAttempt ? toDictationAttemptRecord(existingAttempt) : null
    )

    if (submissionMode.attempt) {
      const session = await DictationSessionModel.findOne({
        _id: parsedSessionId.data.sessionId,
        userId: actor.id,
      }).lean()

      if (!session)
        return jsonError({
          status: 404,
          body: {
            message: 'This dictation session was not found.',
          },
        })

      return NextResponse.json({
        attempt: submissionMode.attempt,
        mode: submissionMode.mode,
        nextSegmentId: session.currentSegmentId
          ? String(session.currentSegmentId)
          : null,
        session: toDictationSessionRecord(session),
      })
    }

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

    if (session.status !== 'active')
      return jsonError({
        status: 409,
        body: {
          message: 'This dictation session is not active.',
        },
      })

    if (String(session.currentSegmentId) !== parsedBody.data.segmentId)
      return jsonError({
        status: 409,
        body: {
          message: 'This attempt is not for the current session segment.',
        },
      })

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

    await attempt.save()

    const nonCheckStatus = getAttemptSegmentStatus(parsedBody.data.action)
    segment.attemptStatus =
      nonCheckStatus ?? getCheckSegmentStatus(correction.isPassed)
    segment.attemptCount += 1
    segment.lastAttemptAt = now
    await segment.save()

    let nextSegmentId: string | null = String(session.currentSegmentId)

    if (
      shouldAdvanceAttemptCursor({
        action: parsedBody.data.action,
        isPassed: correction.isPassed,
      })
    ) {
      const nextSegment = await DictationSegmentModel.findOne({
        order: { $gt: segment.order },
        transcriptId: session.transcriptId,
        videoId: session.videoId,
      }).sort({ order: 1 })

      if (nextSegment) {
        session.currentSegmentId = new Types.ObjectId(String(nextSegment._id))
        session.currentSegmentOrder = nextSegment.order
        nextSegmentId = String(nextSegment._id)
      } else {
        session.status = 'completed'
        session.completedAt = now
        nextSegmentId = null
        await DictationVideoModel.updateOne(
          {
            _id: session.videoId,
          },
          {
            $inc: {
              completedSessionCount: 1,
            },
            $set: {
              lastPracticedAt: now,
              status: 'completed',
            },
          }
        )
      }
    }

    session.lastActiveAt = now
    await session.save()
    await recomputeReviewItemsForVideo({
      userId: actor.id,
      videoId: String(session.videoId),
    })

    return NextResponse.json(
      {
        attempt: toDictationAttemptRecord(attempt.toObject()),
        mode: submissionMode.mode,
        nextSegmentId,
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

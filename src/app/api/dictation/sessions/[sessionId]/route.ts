import { NextResponse } from 'next/server'
import { Types } from 'mongoose'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  parseSessionIdParam,
  parseSessionPatchRequest,
} from '@/modules/dictation/services/sessionRouteDecisions'
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

function toSessionError(error: unknown): ApiErrorDecision {
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

  console.error('Failed to update dictation session', error)

  return {
    status: 500,
    body: {
      message: 'Could not update this dictation session.',
    },
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsed = parseSessionIdParam(params.sessionId)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    const session = await DictationSessionModel.findOne({
      _id: parsed.data.sessionId,
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
      session: toDictationSessionRecord(session),
    })
  } catch (error) {
    return jsonError(toSessionError(error))
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsedId = parseSessionIdParam(params.sessionId)

  if (!parsedId.ok) return jsonError(parsedId)

  try {
    const body = await request.json()
    const parsedBody = parseSessionPatchRequest(body)

    if (!parsedBody.ok) return jsonError(parsedBody)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const session = await DictationSessionModel.findOne({
      _id: parsedId.data.sessionId,
      userId: actor.id,
    })

    if (!session)
      return jsonError({
        status: 404,
        body: {
          message: 'This dictation session was not found.',
        },
      })

    if (parsedBody.data.currentSegmentId) {
      const segment = await DictationSegmentModel.findOne({
        _id: parsedBody.data.currentSegmentId,
        transcriptId: session.transcriptId,
        videoId: session.videoId,
      }).lean()

      if (!segment)
        return jsonError({
          status: 409,
          body: {
            message: 'This segment does not belong to the active session.',
          },
        })
    }

    if (parsedBody.data.currentSegmentId !== undefined)
      session.currentSegmentId = parsedBody.data.currentSegmentId
        ? new Types.ObjectId(parsedBody.data.currentSegmentId)
        : null
    if (parsedBody.data.currentSegmentOrder !== undefined)
      session.currentSegmentOrder = parsedBody.data.currentSegmentOrder
    if (parsedBody.data.playbackSpeed !== undefined)
      session.playbackSpeed = parsedBody.data.playbackSpeed
    if (parsedBody.data.showShortcuts !== undefined)
      session.showShortcuts = parsedBody.data.showShortcuts
    if (parsedBody.data.isVideoHidden !== undefined)
      session.isVideoHidden = parsedBody.data.isVideoHidden
    if (parsedBody.data.status !== undefined) {
      session.status = parsedBody.data.status
      session.completedAt =
        parsedBody.data.status === 'completed' ? new Date() : null
    }

    session.lastActiveAt = new Date()
    await session.save()

    return NextResponse.json({
      session: toDictationSessionRecord(session.toObject()),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toSessionError(error))
  }
}

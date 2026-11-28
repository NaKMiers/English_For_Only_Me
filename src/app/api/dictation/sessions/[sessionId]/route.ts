import { NextResponse } from 'next/server'
import { Types } from 'mongoose'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { resolveSessionCompletedAt } from '@/modules/dictation/practice/sessionCompletion'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requireUser } from '@/lib/auth/currentUser'
import { InvalidOwnerKeyError } from '@/lib/auth/ownerKey'
import {
  parseSessionIdParam,
  parseSessionPatchRequest,
} from '@/modules/dictation/services/sessionRouteDecisions'
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

function toSessionError(error: unknown, t: Messages): ApiErrorDecision {
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

  console.error('Failed to update dictation session', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.sessionUpdateFailed,
    },
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsed = parseSessionIdParam(params.sessionId)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const user = await requireUser()

    await connectDatabase()

    const session = await DictationSessionModel.findOne({
      _id: parsed.data.sessionId,
      userId: user.id,
    }).lean()

    if (!session)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.sessionNotFound,
        },
      })

    return NextResponse.json({
      session: toDictationSessionRecord(session),
    })
  } catch (error) {
    return jsonError(toSessionError(error, t))
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsedId = parseSessionIdParam(params.sessionId)

  if (!parsedId.ok) return jsonError(parsedId)

  try {
    const body = await request.json()
    const parsedBody = parseSessionPatchRequest(body)

    if (!parsedBody.ok) return jsonError(parsedBody)

    const user = await requireUser()

    await connectDatabase()

    const session = await DictationSessionModel.findOne({
      _id: parsedId.data.sessionId,
      userId: user.id,
    })

    if (!session)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.sessionNotFound,
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
            message: t.dictation.api.segmentNotInSession,
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
      session.completedAt = resolveSessionCompletedAt({
        completedAt: session.completedAt,
        nextStatus: parsedBody.data.status,
        now: new Date(),
        previousStatus: session.status,
      })
      session.status = parsedBody.data.status
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
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toSessionError(error, t))
  }
}

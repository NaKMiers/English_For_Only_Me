import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { isDuplicateKeyError } from '@/modules/dictation/practice/duplicateKeyError'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { requireUser } from '@/lib/auth/currentUser'
import { InvalidOwnerKeyError } from '@/lib/auth/ownerKey'
import {
  getSessionStartGuardDecision,
  parseSessionStartRequest,
  resolveSessionStart,
} from '@/modules/dictation/services/sessionRouteDecisions'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

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

  console.error('Failed to start dictation session', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.sessionStartFailed,
    },
  }
}

export async function POST(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseSessionStartRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const user = await requireUser()

    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: parsed.data.videoId,
      status: {
        $ne: 'archived',
      },
    })
    const activeTranscriptId = video?.activeTranscriptId
    const firstSegment =
      video && activeTranscriptId
        ? await DictationSegmentModel.findOne({
            transcriptId: activeTranscriptId,
            videoId: video._id,
          }).sort({ order: 1 })
        : null
    const guardDecision = getSessionStartGuardDecision({
      firstSegment,
      text: t.dictation.api,
      video,
    })

    if (guardDecision) return jsonError(guardDecision)
    if (!video || !firstSegment || !activeTranscriptId)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.videoNotFound,
        },
      })

    const existingSession = await DictationSessionModel.findOne({
      userId: user.id,
      status: 'active',
      videoId: video._id,
    }).sort({ lastActiveAt: -1 })

    // Invariant: at most one active session per (user, video). Legacy data could
    // have stacked several; collapse any strays to 'abandoned' so "In Progress"
    // counts one card per video and the partial-unique index stays satisfiable.
    if (existingSession)
      await DictationSessionModel.updateMany(
        {
          userId: user.id,
          videoId: video._id,
          status: 'active',
          _id: { $ne: existingSession._id },
        },
        { $set: { status: 'abandoned' } }
      )

    const decision = resolveSessionStart({
      existingSession: existingSession
        ? toDictationSessionRecord(existingSession.toObject())
        : null,
      firstSegment,
    })
    const now = new Date()

    if (existingSession) {
      existingSession.lastActiveAt = now
      await existingSession.save()

      return NextResponse.json({
        mode: decision.mode,
        session: toDictationSessionRecord(existingSession.toObject()),
      })
    }

    let session
    try {
      session = await DictationSessionModel.create({
        userId: user.id,
        videoId: video._id,
        transcriptId: activeTranscriptId,
        status: 'active',
        currentSegmentId: firstSegment._id,
        currentSegmentOrder: firstSegment.order,
        playbackSpeed: 1,
        showShortcuts: true,
        isVideoHidden: false,
        startedAt: now,
        lastActiveAt: now,
      })
    } catch (error) {
      // The partial-unique index rejects a second concurrent start for the same
      // (user, video). Lost the race - reuse the session the winner created.
      if (isDuplicateKeyError(error)) {
        const raced = await DictationSessionModel.findOne({
          userId: user.id,
          status: 'active',
          videoId: video._id,
        }).sort({ lastActiveAt: -1 })

        if (raced)
          return NextResponse.json({
            mode: 'resume' as const,
            session: toDictationSessionRecord(raced.toObject()),
          })
      }

      throw error
    }

    return NextResponse.json(
      {
        mode: decision.mode,
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

    return jsonError(toSessionError(error, t))
  }
}

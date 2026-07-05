import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationSessionModel } from '@/models/dictation/DictationSessionModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationSessionRecord } from '@/modules/dictation/services/dictationSessionRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  getSessionStartGuardDecision,
  parseSessionStartRequest,
  resolveSessionStart,
} from '@/modules/dictation/services/sessionRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toSessionError(error: unknown): ApiErrorDecision {
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
      message: 'Could not start this dictation session.',
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseSessionStartRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: parsed.data.videoId,
      ownerId,
    })
    const activeTranscriptId = video?.activeTranscriptId
    const firstSegment =
      video && activeTranscriptId
        ? await DictationSegmentModel.findOne({
            ownerId,
            transcriptId: activeTranscriptId,
            videoId: video._id,
          }).sort({ order: 1 })
        : null
    const guardDecision = getSessionStartGuardDecision({
      firstSegment,
      ownerId,
      video,
    })

    if (guardDecision) return jsonError(guardDecision)
    if (!video || !firstSegment || !activeTranscriptId)
      return jsonError({
        status: 404,
        body: {
          message: 'This dictation video was not found.',
        },
      })

    const existingSession = await DictationSessionModel.findOne({
      ownerId,
      status: 'active',
      videoId: video._id,
    }).sort({ lastActiveAt: -1 })
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

    const session = await DictationSessionModel.create({
      ownerId,
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

    if (video.status === 'ready' || video.status === 'transcriptReady') {
      video.status = 'inProgress'
      await video.save()
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
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toSessionError(error))
  }
}

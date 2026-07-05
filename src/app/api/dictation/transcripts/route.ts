import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationTranscriptRecord } from '@/modules/dictation/services/dictationTranscriptRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { parseTranscriptRequest } from '@/modules/dictation/services/transcriptRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toTranscriptError(error: unknown): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
    return {
      status: 409,
      body: {
        message: 'This transcript source is already attached to the video.',
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to save dictation transcript', error)

  return {
    status: 500,
    body: {
      message: 'Could not save this transcript.',
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseTranscriptRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: parsed.data.videoId,
      ownerId,
    })

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: 'This dictation video was not found.',
        },
      })

    const existingTranscript = await DictationTranscriptModel.findOne({
      ownerId,
      videoId: video._id,
      sourceHash: parsed.data.normalized.sourceHash,
    })

    if (existingTranscript) {
      await DictationTranscriptModel.updateMany(
        { ownerId, videoId: video._id, _id: { $ne: existingTranscript._id } },
        { $set: { isActive: false } }
      )

      existingTranscript.isActive = true
      await existingTranscript.save()

      video.activeTranscriptId = existingTranscript._id
      video.transcriptStatus = 'manualAdded'
      video.status = 'transcriptReady'
      await video.save()

      return NextResponse.json({
        transcript: toDictationTranscriptRecord(existingTranscript.toObject()),
        videoId: String(video._id),
      })
    }

    await DictationTranscriptModel.updateMany(
      { ownerId, videoId: video._id, isActive: true },
      { $set: { isActive: false } }
    )

    const transcript = await DictationTranscriptModel.create({
      ownerId,
      videoId: video._id,
      sourceType: parsed.data.normalized.sourceType,
      language: parsed.data.normalized.language,
      isActive: true,
      rawText: parsed.data.normalized.normalizedText,
      rawCues: parsed.data.normalized.rawCues,
      sourceHash: parsed.data.normalized.sourceHash,
      qualityStatus: parsed.data.normalized.qualityStatus,
      qualityFlags: parsed.data.normalized.qualityFlags,
      cueCount: parsed.data.normalized.cueCount,
      segmentCount: 0,
      createdBy: 'manual',
    })

    video.activeTranscriptId = transcript._id
    video.transcriptStatus = 'manualAdded'
    video.status = 'transcriptReady'
    await video.save()

    return NextResponse.json(
      {
        transcript: toDictationTranscriptRecord(transcript.toObject()),
        videoId: String(video._id),
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

    return jsonError(toTranscriptError(error))
  }
}

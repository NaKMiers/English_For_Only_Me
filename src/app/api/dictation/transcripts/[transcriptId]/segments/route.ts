import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { buildDictationSegments } from '@/modules/dictation/segmenting/buildSegments'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  persistRebuiltSegments,
  toCueRecords,
} from '@/modules/dictation/services/rebuildTranscriptSegments'
import {
  getSegmentBuildGuardDecision,
  parseTranscriptIdParam,
} from '@/modules/dictation/services/segmentRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{
    transcriptId: string
  }>
}

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toSegmentError(error: unknown): ApiErrorDecision {
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

  console.error('Failed to build dictation segments', error)

  return {
    status: 500,
    body: {
      message: 'Could not build dictation segments.',
    },
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsed = parseTranscriptIdParam(params.transcriptId)

  if (!parsed.ok) return jsonError(parsed)

  try {
    await requireAdmin()

    await connectDatabase()

    const transcript = await DictationTranscriptModel.findOne({
      _id: parsed.data.transcriptId,
    }).lean()

    if (!transcript)
      return jsonError({
        status: 404,
        body: {
          message: 'This transcript was not found.',
        },
      })

    const segments = await DictationSegmentModel.find({
      transcriptId: transcript._id,
    })
      .sort({ order: 1 })
      .lean()

    return NextResponse.json({
      segments: segments.map(toDictationSegmentRecord),
      transcriptId: String(transcript._id),
    })
  } catch (error) {
    return jsonError(toSegmentError(error))
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsed = parseTranscriptIdParam(params.transcriptId)

  if (!parsed.ok) return jsonError(parsed)

  try {
    await requireAdmin()

    await connectDatabase()

    const transcript = await DictationTranscriptModel.findOne({
      _id: parsed.data.transcriptId,
    })
    const video = transcript
      ? await DictationVideoModel.findOne({
          _id: transcript.videoId,
        })
      : null
    const guardDecision = getSegmentBuildGuardDecision({
      transcript,
      video,
    })

    if (guardDecision) return jsonError(guardDecision)
    if (!transcript || !video)
      return jsonError({
        status: 404,
        body: {
          message: 'This transcript was not found.',
        },
      })

    const built = buildDictationSegments({
      rawCues: toCueRecords(transcript.rawCues),
      rawText: transcript.rawText,
    })

    if (built.segments.length === 0)
      return jsonError({
        status: 409,
        body: {
          message: 'This transcript did not produce usable segments.',
        },
      })

    const { createdSegments } = await persistRebuiltSegments({
      transcript,
      video,
      built,
    })

    return NextResponse.json(
      {
        qualityFlags: built.qualityFlags,
        qualityStatus: built.qualityStatus,
        segments: createdSegments.map(segment =>
          toDictationSegmentRecord(segment.toObject())
        ),
        transcriptId: String(transcript._id),
        videoId: String(video._id),
      },
      { status: 201 }
    )
  } catch (error) {
    return jsonError(toSegmentError(error))
  }
}

import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { buildDictationSegments } from '@/modules/dictation/segmenting/buildSegments'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import type { DictationCueRecord } from '@/modules/dictation/types'
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

function toCueRecords(
  cues: {
    endMs?: number | null
    index: number
    startMs?: number | null
    text: string
  }[]
): DictationCueRecord[] {
  return cues.map(cue => ({
    endMs: cue.endMs ?? null,
    index: cue.index,
    startMs: cue.startMs ?? null,
    text: cue.text,
  }))
}

export async function GET(_request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsed = parseTranscriptIdParam(params.transcriptId)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const transcript = await DictationTranscriptModel.findOne({
      _id: parsed.data.transcriptId,
      ownerId,
    }).lean()

    if (!transcript)
      return jsonError({
        status: 404,
        body: {
          message: 'This transcript was not found.',
        },
      })

    const segments = await DictationSegmentModel.find({
      ownerId,
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
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const transcript = await DictationTranscriptModel.findOne({
      _id: parsed.data.transcriptId,
      ownerId,
    })
    const video = transcript
      ? await DictationVideoModel.findOne({
          _id: transcript.videoId,
          ownerId,
        })
      : null
    const guardDecision = getSegmentBuildGuardDecision({
      ownerId,
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

    await DictationSegmentModel.deleteMany({
      ownerId,
      transcriptId: transcript._id,
    })

    const createdSegments = await DictationSegmentModel.insertMany(
      built.segments.map(segment => ({
        ownerId,
        videoId: video._id,
        transcriptId: transcript._id,
        transcriptSourceHash: transcript.sourceHash,
        order: segment.order,
        text: segment.text,
        normalizedText: segment.normalizedText,
        startMs: segment.startMs,
        endMs: segment.endMs,
        cueIndexes: segment.cueIndexes,
        qualityFlags: segment.qualityFlags,
        warningAccepted: segment.warningAccepted,
        attemptStatus: 'notStarted',
        attemptCount: 0,
      }))
    )

    transcript.segmentCount = createdSegments.length
    await transcript.save()

    video.status = 'ready'
    video.sentenceCount = createdSegments.length
    await video.save()

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

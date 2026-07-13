import { Types } from 'mongoose'
import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { buildDictationSegments } from '@/modules/dictation/segmenting/buildSegments'
import { toDictationTranscriptRecord } from '@/modules/dictation/services/dictationTranscriptRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  persistRebuiltSegments,
  toCueRecords,
} from '@/modules/dictation/services/rebuildTranscriptSegments'
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

// Enforce one transcript per (video, language): when a new source transcript
// wins, delete any older same-language transcripts and their orphaned segments
// so re-uploading English overwrites instead of accumulating dead rows.
async function pruneSupersededTranscripts(
  videoId: Types.ObjectId,
  keepId: Types.ObjectId,
  language: string
) {
  const superseded = await DictationTranscriptModel.find({
    videoId,
    language,
    _id: { $ne: keepId },
  })
    .select('_id')
    .lean()

  if (superseded.length === 0) return

  const ids = superseded.map(item => item._id)

  await DictationSegmentModel.deleteMany({
    transcriptId: { $in: ids },
  })
  await DictationTranscriptModel.deleteMany({ _id: { $in: ids } })
}

// Build segments for a primary transcript right here on the server, so a new
// video always has practice segments the moment its captions are saved - the
// app never depends on a separate client-side build call succeeding.
async function autoBuildPrimarySegments(
  transcript: Parameters<typeof persistRebuiltSegments>[0]['transcript'],
  video: Parameters<typeof persistRebuiltSegments>[0]['video']
) {
  const built = buildDictationSegments({
    rawCues: toCueRecords(transcript.rawCues),
    rawText: transcript.rawText,
  })

  if (built.segments.length > 0)
    await persistRebuiltSegments({ transcript, video, built })
}

function toTranscriptError(error: unknown): ApiErrorDecision {
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

    await requireAdmin()

    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: parsed.data.videoId,
      status: {
        $ne: 'archived',
      },
    })

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: 'This dictation video was not found.',
        },
      })

    // Translation caption track: attach an alternate-language transcript without
    // touching the English primary (no activeTranscriptId change, no segments).
    if (parsed.data.role === 'translation') {
      const existingTrack = await DictationTranscriptModel.findOne({
        videoId: video._id,
        sourceHash: parsed.data.normalized.sourceHash,
      })

      if (existingTrack)
        return NextResponse.json({
          transcript: toDictationTranscriptRecord(existingTrack.toObject()),
          videoId: String(video._id),
        })

      // One track per language: replacing a language's captions removes the old
      // file so practice never sees two tracks for the same language.
      await DictationTranscriptModel.deleteMany({
        videoId: video._id,
        language: parsed.data.normalized.language,
        isActive: false,
      })

      const track = await DictationTranscriptModel.create({
        videoId: video._id,
        sourceType: parsed.data.normalized.sourceType,
        language: parsed.data.normalized.language,
        isActive: false,
        rawText: parsed.data.rawText,
        rawCues: parsed.data.normalized.rawCues,
        sourceHash: parsed.data.normalized.sourceHash,
        qualityStatus: parsed.data.normalized.qualityStatus,
        qualityFlags: parsed.data.normalized.qualityFlags,
        cueCount: parsed.data.normalized.cueCount,
        segmentCount: 0,
        createdBy: 'manual',
      })

      return NextResponse.json(
        {
          transcript: toDictationTranscriptRecord(track.toObject()),
          videoId: String(video._id),
        },
        { status: 201 }
      )
    }

    const existingTranscript = await DictationTranscriptModel.findOne({
      videoId: video._id,
      sourceHash: parsed.data.normalized.sourceHash,
    })

    if (existingTranscript) {
      await DictationTranscriptModel.updateMany(
        {
          videoId: video._id,
          _id: { $ne: existingTranscript._id },
        },
        { $set: { isActive: false } }
      )

      existingTranscript.isActive = true
      await existingTranscript.save()

      video.activeTranscriptId = existingTranscript._id
      video.transcriptStatus = 'manualAdded'
      video.status = 'transcriptReady'
      await video.save()

      await pruneSupersededTranscripts(
        video._id,
        existingTranscript._id,
        parsed.data.normalized.language
      )

      await autoBuildPrimarySegments(existingTranscript, video)

      return NextResponse.json({
        transcript: toDictationTranscriptRecord(existingTranscript.toObject()),
        videoId: String(video._id),
      })
    }

    await DictationTranscriptModel.updateMany(
      { videoId: video._id, isActive: true },
      { $set: { isActive: false } }
    )

    const transcript = await DictationTranscriptModel.create({
      videoId: video._id,
      sourceType: parsed.data.normalized.sourceType,
      language: parsed.data.normalized.language,
      isActive: true,
      rawText: parsed.data.rawText,
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

    await pruneSupersededTranscripts(
      video._id,
      transcript._id,
      parsed.data.normalized.language
    )

    await autoBuildPrimarySegments(transcript, video)

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

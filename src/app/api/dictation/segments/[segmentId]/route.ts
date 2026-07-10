import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  DictationSegmentModel,
  type DictationSegmentDocument,
} from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import {
  editSegment,
  mergeSegments,
  splitSegmentAt,
} from '@/modules/dictation/segmenting/editSegments'
import type { EditableSegment } from '@/modules/dictation/segmenting/types'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  getSegmentEditGuardDecision,
  parseSegmentEditRequest,
  parseSegmentIdParam,
} from '@/modules/dictation/services/segmentRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{
    segmentId: string
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

  console.error('Failed to edit dictation segment', error)

  return {
    status: 500,
    body: {
      message: 'Could not edit this segment.',
    },
  }
}

function toEditableSegment(
  segment: DictationSegmentDocument & {
    _id: unknown
  }
): EditableSegment {
  return {
    cueIndexes: segment.cueIndexes,
    endMs: segment.endMs ?? null,
    id: String(segment._id),
    normalizedText: segment.normalizedText,
    order: segment.order,
    qualityFlags: segment.qualityFlags,
    startMs: segment.startMs ?? null,
    text: segment.text,
    warningAccepted: segment.warningAccepted,
  }
}

async function updateSegmentCount({
  transcriptId,
  videoId,
}: {
  transcriptId: DictationSegmentDocument['transcriptId']
  videoId: DictationSegmentDocument['videoId']
}) {
  const segmentCount = await DictationSegmentModel.countDocuments({
    transcriptId,
  })

  await Promise.all([
    DictationTranscriptModel.updateOne(
      { _id: transcriptId },
      { $set: { segmentCount } }
    ),
    DictationVideoModel.updateOne(
      { _id: videoId },
      { $set: { sentenceCount: segmentCount } }
    ),
  ])

  return segmentCount
}

async function loadSegmentGraph(segmentId: string) {
  const segment = await DictationSegmentModel.findOne({
    _id: segmentId,
  })

  if (!segment) return { segment: null, transcript: null, video: null }

  const transcript = await DictationTranscriptModel.findOne({
    _id: segment.transcriptId,
  })
  const video = transcript
    ? await DictationVideoModel.findOne({
        _id: segment.videoId,
      })
    : null

  return { segment, transcript, video }
}

function applyEditableValues(
  segment: DictationSegmentDocument,
  values: EditableSegment
) {
  segment.text = values.text
  segment.normalizedText = values.normalizedText
  segment.startMs = values.startMs
  segment.endMs = values.endMs
  segment.cueIndexes = values.cueIndexes
  segment.qualityFlags = values.qualityFlags
  segment.warningAccepted = values.warningAccepted
}

export async function PATCH(request: Request, context: RouteContext) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const params = await context.params
  const parsedId = parseSegmentIdParam(params.segmentId)

  if (!parsedId.ok) return jsonError(parsedId)

  try {
    const body = await request.json()
    const parsedBody = parseSegmentEditRequest(body)

    if (!parsedBody.ok) return jsonError(parsedBody)

    await requireAdmin()

    await connectDatabase()

    const { segment, transcript, video } = await loadSegmentGraph(
      parsedId.data.segmentId
    )

    if (!segment)
      return jsonError({
        status: 404,
        body: {
          message: 'This segment was not found.',
        },
      })

    const guardDecision = getSegmentEditGuardDecision({
      segmentSourceHash: segment.transcriptSourceHash,
      transcript,
      video,
    })

    if (guardDecision) return jsonError(guardDecision)

    if (parsedBody.data.action === 'acceptWarning') {
      segment.warningAccepted = true
      await segment.save()

      return NextResponse.json({
        segment: toDictationSegmentRecord(segment.toObject()),
      })
    }

    if (parsedBody.data.action === 'edit') {
      const editedSegment = editSegment(toEditableSegment(segment), {
        endMs: parsedBody.data.endMs,
        startMs: parsedBody.data.startMs,
        text: parsedBody.data.text,
      })

      applyEditableValues(segment, editedSegment)
      await segment.save()

      return NextResponse.json({
        segment: toDictationSegmentRecord(segment.toObject()),
      })
    }

    if (parsedBody.data.action === 'split') {
      const [leftSegment, rightSegment] = splitSegmentAt(
        toEditableSegment(segment),
        parsedBody.data.splitAt
      )

      await DictationSegmentModel.updateMany(
        {
          transcriptId: segment.transcriptId,
          order: { $gt: segment.order },
        },
        { $inc: { order: 1 } }
      )

      applyEditableValues(segment, leftSegment)
      await segment.save()

      const createdSegment = await DictationSegmentModel.create({
        videoId: segment.videoId,
        transcriptId: segment.transcriptId,
        transcriptSourceHash: segment.transcriptSourceHash,
        order: rightSegment.order,
        text: rightSegment.text,
        normalizedText: rightSegment.normalizedText,
        startMs: rightSegment.startMs,
        endMs: rightSegment.endMs,
        cueIndexes: rightSegment.cueIndexes,
        qualityFlags: rightSegment.qualityFlags,
        warningAccepted: rightSegment.warningAccepted,
        attemptStatus: 'notStarted',
        attemptCount: 0,
      })

      await updateSegmentCount({
        transcriptId: segment.transcriptId,
        videoId: segment.videoId,
      })

      return NextResponse.json({
        segment: toDictationSegmentRecord(segment.toObject()),
        createdSegment: toDictationSegmentRecord(createdSegment.toObject()),
      })
    }

    const direction = parsedBody.data.action
    const neighborOrder =
      direction === 'mergePrevious' ? segment.order - 1 : segment.order + 1
    const neighbor = await DictationSegmentModel.findOne({
      transcriptId: segment.transcriptId,
      order: neighborOrder,
    })

    if (!neighbor)
      return jsonError({
        status: 409,
        body: {
          message: 'There is no adjacent segment to merge.',
        },
      })

    const previousSegment = direction === 'mergePrevious' ? neighbor : segment
    const nextSegment = direction === 'mergePrevious' ? segment : neighbor
    const mergedSegment = mergeSegments(
      toEditableSegment(previousSegment),
      toEditableSegment(nextSegment)
    )
    const segmentToKeep = direction === 'mergePrevious' ? neighbor : segment
    const segmentToDelete = direction === 'mergePrevious' ? segment : neighbor
    const deletedOrder = segmentToDelete.order

    applyEditableValues(segmentToKeep, mergedSegment)
    await segmentToKeep.save()
    await segmentToDelete.deleteOne()
    await DictationSegmentModel.updateMany(
      {
        transcriptId: segment.transcriptId,
        order: { $gt: deletedOrder },
      },
      { $inc: { order: -1 } }
    )

    await updateSegmentCount({
      transcriptId: segment.transcriptId,
      videoId: segment.videoId,
    })

    return NextResponse.json({
      segment: toDictationSegmentRecord(segmentToKeep.toObject()),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toSegmentError(error))
  }
}

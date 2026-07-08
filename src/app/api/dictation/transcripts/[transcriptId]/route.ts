import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { parseTranscriptIdParam } from '@/modules/dictation/services/segmentRouteDecisions'
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

// Remove a translation caption track. Refuses to delete a video's active
// (primary English) transcript so practice segments can't be orphaned.
export async function DELETE(_request: Request, context: RouteContext) {
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

    if (!transcript)
      return jsonError({
        status: 404,
        body: { message: 'This transcript was not found.' },
      })

    const video = await DictationVideoModel.findOne({
      _id: transcript.videoId,
      ownerId,
    })

    if (
      video &&
      String(video.activeTranscriptId) === String(transcript._id)
    )
      return jsonError({
        status: 409,
        body: {
          message: 'Cannot delete the active transcript for this video.',
        },
      })

    await transcript.deleteOne()

    return NextResponse.json({ deleted: true, transcriptId: String(transcript._id) })
  } catch (error) {
    if (error instanceof MissingEnvironmentError)
      return jsonError({
        status: 500,
        body: { message: MISSING_MONGODB_MESSAGE },
      })

    console.error('Failed to delete dictation transcript', error)

    return jsonError({
      status: 500,
      body: { message: 'Could not delete this transcript.' },
    })
  }
}

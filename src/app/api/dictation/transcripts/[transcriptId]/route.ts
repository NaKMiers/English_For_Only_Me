import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
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

function authErrorDecision(error: unknown): ApiErrorDecision | null {
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

  return null
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
    await requireAdmin()

    await connectDatabase()

    const transcript = await DictationTranscriptModel.findOne({
      _id: parsed.data.transcriptId,
    })

    if (!transcript)
      return jsonError({
        status: 404,
        body: { message: 'This transcript was not found.' },
      })

    const video = await DictationVideoModel.findOne({
      _id: transcript.videoId,
    })

    if (video && String(video.activeTranscriptId) === String(transcript._id))
      return jsonError({
        status: 409,
        body: {
          message: 'Cannot delete the active transcript for this video.',
        },
      })

    await transcript.deleteOne()

    return NextResponse.json({
      deleted: true,
      transcriptId: String(transcript._id),
    })
  } catch (error) {
    const authError = authErrorDecision(error)
    if (authError) return jsonError(authError)

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

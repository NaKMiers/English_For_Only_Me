import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { revalidateDictationCatalog } from '@/lib/db/revalidateCatalog'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import { parseTranscriptIdParam } from '@/modules/dictation/services/segmentRouteDecisions'
import {
  getAccessErrorMessage,
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

function authErrorDecision(
  error: unknown,
  t: Messages
): ApiErrorDecision | null {
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

  return null
}

// Remove a translation caption track. Refuses to delete a video's active
// (primary English) transcript so practice segments can't be orphaned.
export async function DELETE(_request: Request, context: RouteContext) {
  const t = await getMessages()
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
        body: { message: t.dictation.api.transcriptNotFound },
      })

    const video = await DictationVideoModel.findOne({
      _id: transcript.videoId,
    })

    if (video && String(video.activeTranscriptId) === String(transcript._id))
      return jsonError({
        status: 409,
        body: {
          message: t.dictation.api.transcriptActiveDelete,
        },
      })

    await transcript.deleteOne()

    revalidateDictationCatalog()

    return NextResponse.json({
      deleted: true,
      transcriptId: String(transcript._id),
    })
  } catch (error) {
    const authError = authErrorDecision(error, t)
    if (authError) return jsonError(authError)

    if (error instanceof MissingEnvironmentError)
      return jsonError({
        status: 500,
        body: { message: MISSING_MONGODB_MESSAGE },
      })

    console.error('Failed to delete dictation transcript', error)

    return jsonError({
      status: 500,
      body: { message: t.dictation.api.transcriptDeleteFailed },
    })
  }
}

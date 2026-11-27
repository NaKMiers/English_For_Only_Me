import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { revalidateDictationCatalog } from '@/lib/db/revalidateCatalog'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationTranscriptModel } from '@/models/dictation/DictationTranscriptModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationSegmentRecord } from '@/modules/dictation/services/dictationSegmentRecords'
import { toDictationTranscriptRecord } from '@/modules/dictation/services/dictationTranscriptRecords'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
  parseUpdateVideoRequest,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

interface Props {
  params: Promise<{
    videoId: string
  }>
}

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

// requireAdmin throws 401/403 - map to JSON instead of a 500.
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

function toArchiveError(error: unknown, t: Messages): ApiErrorDecision {
  const authError = authErrorDecision(error, t)
  if (authError) return authError

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to archive dictation video', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.videoDeleteFailed,
    },
  }
}

export async function GET(_request: Request, { params }: Props) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId))
    return jsonError({
      status: 400,
      body: {
        message: t.dictation.api.invalidVideoId,
      },
    })

  try {
    await requireAdmin()

    await connectDatabase()

    const video = await DictationVideoModel.findOne({
      _id: videoId,
      status: {
        $ne: 'archived',
      },
    }).lean()

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.videoNotFound,
        },
      })

    const trackDocuments = await DictationTranscriptModel.find({
      videoId: video._id,
    })
      .sort({ language: 1 })
      .lean()
    const segmentDocuments = video.activeTranscriptId
      ? await DictationSegmentModel.find({
          videoId: video._id,
          transcriptId: video.activeTranscriptId,
        })
          .sort({ order: 1 })
          .lean()
      : []

    return NextResponse.json({
      segments: segmentDocuments.map(toDictationSegmentRecord),
      tracks: trackDocuments.map(toDictationTranscriptRecord),
      video: toDictationVideoRecord(video),
    })
  } catch (error) {
    return jsonError(toUpdateError(error, t))
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId))
    return jsonError({
      status: 400,
      body: {
        message: t.dictation.api.invalidVideoId,
      },
    })

  try {
    await requireAdmin()

    await connectDatabase()

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        _id: videoId,
        status: {
          $ne: 'archived',
        },
      },
      {
        $set: {
          status: 'archived',
        },
      },
      {
        returnDocument: 'after',
      }
    ).lean()

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.videoNotFound,
        },
      })

    revalidateDictationCatalog()

    return NextResponse.json({
      video: toDictationVideoRecord(video),
    })
  } catch (error) {
    return jsonError(toArchiveError(error, t))
  }
}

function toUpdateError(error: unknown, t: Messages): ApiErrorDecision {
  const authError = authErrorDecision(error, t)
  if (authError) return authError

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to update dictation video', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.videoUpdateFailed,
    },
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId))
    return jsonError({
      status: 400,
      body: {
        message: t.dictation.api.invalidVideoId,
      },
    })

  try {
    await requireAdmin()

    const body = await request.json()
    const parsed = parseUpdateVideoRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    await connectDatabase()

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        _id: videoId,
        status: {
          $ne: 'archived',
        },
      },
      {
        $set: {
          defaultLanguage: parsed.data.defaultLanguage,
        },
      },
      {
        returnDocument: 'after',
      }
    ).lean()

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.videoNotFound,
        },
      })

    revalidateDictationCatalog()

    return NextResponse.json({
      video: toDictationVideoRecord(video),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toUpdateError(error, t))
  }
}

import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { revalidateDictationCatalog } from '@/lib/db/revalidateCatalog'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
  parseCreateVideoRequest,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

// requireAdmin throws 401/403 - surface as JSON instead of a 500.
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

function toCreateError(error: unknown, t: Messages): ApiErrorDecision {
  const authError = authErrorDecision(error, t)
  if (authError) return authError

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
    return {
      status: 409,
      body: {
        message: t.dictation.api.videoDuplicate,
      },
    }

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to create dictation video', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.videoCreateFailed,
    },
  }
}

function toListError(error: unknown, t: Messages): ApiErrorDecision {
  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to list dictation videos', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.videosLoadFailed,
    },
  }
}

export async function GET() {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    await connectDatabase()

    const videos = await DictationVideoModel.find({
      status: {
        $ne: 'archived',
      },
    })
      .sort({ order: 1, createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      videos: videos.map(toDictationVideoRecord),
    })
  } catch (error) {
    return jsonError(toListError(error, t))
  }
}

export async function POST(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    // Only admins create catalog videos; content is global (no owner).
    await requireAdmin()

    const body = await request.json()
    const parsed = parseCreateVideoRequest({ body })

    if (!parsed.ok) return jsonError(parsed)

    await connectDatabase()

    const order = await DictationVideoModel.countDocuments({
      status: { $ne: 'archived' },
    })
    const video = await DictationVideoModel.create({ ...parsed.data, order })

    revalidateDictationCatalog()

    return NextResponse.json(
      {
        video: toDictationVideoRecord(video.toObject()),
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toCreateError(error, t))
  }
}

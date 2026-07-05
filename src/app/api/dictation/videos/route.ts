import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
  parseCreateVideoRequest,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toCreateError(error: unknown): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
    return {
      status: 409,
      body: {
        message: 'This video is already in your dictation library.',
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
      message: 'Could not create the dictation video.',
    },
  }
}

function toListError(error: unknown): ApiErrorDecision {
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
      message: 'Could not load dictation videos.',
    },
  }
}

export async function GET() {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const videos = await DictationVideoModel.find({ ownerId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({
      videos: videos.map(toDictationVideoRecord),
    })
  } catch (error) {
    return jsonError(toListError(error))
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const ownerId = await getCurrentOwnerId()
    const parsed = parseCreateVideoRequest({ body, ownerId })

    if (!parsed.ok) return jsonError(parsed)

    await connectDatabase()

    const video = await DictationVideoModel.create(parsed.data)

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
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toCreateError(error))
  }
}

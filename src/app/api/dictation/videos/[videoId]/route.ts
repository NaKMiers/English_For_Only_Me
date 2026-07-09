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

function toArchiveError(error: unknown): ApiErrorDecision {
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
      message: 'Could not delete this dictation video.',
    },
  }
}

export async function DELETE(_request: Request, { params }: Props) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId))
    return jsonError({
      status: 400,
      body: {
        message: 'Invalid video id.',
      },
    })

  try {
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        _id: videoId,
        ownerId,
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
        new: true,
      }
    ).lean()

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: 'Dictation video was not found.',
        },
      })

    return NextResponse.json({
      video: toDictationVideoRecord(video),
    })
  } catch (error) {
    return jsonError(toArchiveError(error))
  }
}

function toUpdateError(error: unknown): ApiErrorDecision {
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
      message: 'Could not update this dictation video.',
    },
  }
}

export async function PATCH(request: Request, { params }: Props) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { videoId } = await params

  if (!/^[a-f\d]{24}$/i.test(videoId))
    return jsonError({
      status: 400,
      body: {
        message: 'Invalid video id.',
      },
    })

  try {
    const body = await request.json()
    const parsed = parseUpdateVideoRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const video = await DictationVideoModel.findOneAndUpdate(
      {
        _id: videoId,
        ownerId,
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
        new: true,
      }
    ).lean()

    if (!video)
      return jsonError({
        status: 404,
        body: {
          message: 'Dictation video was not found.',
        },
      })

    return NextResponse.json({
      video: toDictationVideoRecord(video),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toUpdateError(error))
  }
}

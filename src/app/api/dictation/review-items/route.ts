import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  listDueReviewItemsForUser,
  markReviewItemForUser,
  recomputeReviewItemsForVideo,
} from '@/modules/dictation/review/reviewItemService'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  parseListReviewItemsRequest,
  parseRecomputeReviewItemsRequest,
  parseUpdateReviewItemRequest,
} from '@/modules/dictation/services/reviewItemRouteDecisions'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toReviewItemError(error: unknown, t: Messages): ApiErrorDecision {
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

  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to update dictation review items', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.reviewUpdateFailed,
    },
  }
}

export async function GET(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseListReviewItemsRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      reviewItems: await listDueReviewItemsForUser({
        limit: parsed.data.limit,
        userId: actor.id,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    return jsonError(toReviewItemError(error, t))
  }
}

export async function POST(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseRecomputeReviewItemsRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      reviewItems: await recomputeReviewItemsForVideo({
        userId: actor.id,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toReviewItemError(error, t))
  }
}

export async function PATCH(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseUpdateReviewItemRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const reviewItem = await markReviewItemForUser({
      action: parsed.data.action,
      userId: actor.id,
      reviewItemId: parsed.data.reviewItemId,
    })

    if (!reviewItem)
      return jsonError({
        status: 404,
        body: {
          message: t.dictation.api.reviewItemNotFound,
        },
      })

    return NextResponse.json({
      reviewItem,
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.invalidJson,
        },
      })

    return jsonError(toReviewItemError(error, t))
  }
}

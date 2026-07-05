import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  listDueReviewItemsForOwner,
  markReviewItemForOwner,
  recomputeReviewItemsForVideo,
} from '@/modules/dictation/review/reviewItemService'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  parseListReviewItemsRequest,
  parseRecomputeReviewItemsRequest,
  parseUpdateReviewItemRequest,
} from '@/modules/dictation/services/reviewItemRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toReviewItemError(error: unknown): ApiErrorDecision {
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
      message: 'Could not update dictation review items.',
    },
  }
}

export async function GET(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseListReviewItemsRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    return NextResponse.json({
      reviewItems: await listDueReviewItemsForOwner({
        limit: parsed.data.limit,
        ownerId,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    return jsonError(toReviewItemError(error))
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseRecomputeReviewItemsRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    return NextResponse.json({
      reviewItems: await recomputeReviewItemsForVideo({
        ownerId,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toReviewItemError(error))
  }
}

export async function PATCH(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseUpdateReviewItemRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const reviewItem = await markReviewItemForOwner({
      action: parsed.data.action,
      ownerId,
      reviewItemId: parsed.data.reviewItemId,
    })

    if (!reviewItem)
      return jsonError({
        status: 404,
        body: {
          message: 'This review item was not found.',
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
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toReviewItemError(error))
  }
}

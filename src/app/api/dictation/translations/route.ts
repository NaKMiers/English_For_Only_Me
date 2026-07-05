import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'
import { getOrCreateSegmentTranslation } from '@/modules/dictation/translations/translationService'
import { parseTranslationPayload } from '@/modules/dictation/translations/translationRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toTranslationError(error: unknown): ApiErrorDecision {
  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to load dictation translation', error)

  return {
    status: 500,
    body: {
      message: 'Could not load this dictation translation.',
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseTranslationPayload(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const result = await getOrCreateSegmentTranslation({
      ownerId,
      segmentId: parsed.data.segmentId,
      targetLanguage: parsed.data.targetLanguage,
    })

    if (!result.ok)
      return jsonError({
        status: result.status,
        body: {
          message: result.message,
        },
      })

    return NextResponse.json({
      mode: result.mode,
      translation: result.translation,
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toTranslationError(error))
  }
}

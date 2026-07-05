import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { generateDictationDebriefForOwner } from '@/modules/dictation/ai/debriefService'
import { parseDebriefPayload } from '@/modules/dictation/ai/debriefDecisions'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toDebriefError(error: unknown): ApiErrorDecision {
  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to generate dictation debrief', error)

  return {
    status: 500,
    body: {
      message: 'Could not generate this dictation debrief.',
    },
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseDebriefPayload(body)

    if (!parsed.ok) return jsonError(parsed)

    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    const result = await generateDictationDebriefForOwner({
      notes: parsed.data.notes,
      ownerId,
      videoId: parsed.data.videoId,
    })

    if (!result.ok)
      return jsonError({
        status: result.status,
        body: {
          message: result.message,
        },
      })

    return NextResponse.json({
      debrief: result.debrief,
      mode: result.mode,
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: {
          message: 'Request body must be valid JSON.',
        },
      })

    return jsonError(toDebriefError(error))
  }
}

import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { parseStatsSearchParams } from '@/modules/dictation/services/statsRouteDecisions'
import {
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'
import { getGlobalStatsForOwner } from '@/modules/dictation/stats/globalStatsService'
import { getVideoStatsForOwner } from '@/modules/dictation/stats/videoStatsService'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toStatsError(error: unknown): ApiErrorDecision {
  if (error instanceof MissingEnvironmentError)
    return {
      status: 500,
      body: {
        message: MISSING_MONGODB_MESSAGE,
      },
    }

  console.error('Failed to load dictation stats', error)

  return {
    status: 500,
    body: {
      message: 'Could not load dictation stats.',
    },
  }
}

export async function GET(request: Request) {
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseStatsSearchParams(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const ownerId = await getCurrentOwnerId()

    await connectDatabase()

    if (parsed.data.scope === 'global')
      return NextResponse.json({
        stats: await getGlobalStatsForOwner(ownerId),
      })

    return NextResponse.json({
      stats: await getVideoStatsForOwner({
        ownerId,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    return jsonError(toStatsError(error))
  }
}

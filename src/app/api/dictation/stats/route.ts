import { NextResponse } from 'next/server'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { parseStatsSearchParams } from '@/modules/dictation/services/statsRouteDecisions'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import { getVideoStatsForUser } from '@/modules/dictation/stats/videoStatsService'

export const runtime = 'nodejs'

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toStatsError(error: unknown, t: Messages): ApiErrorDecision {
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

  console.error('Failed to load dictation stats', error)

  return {
    status: 500,
    body: {
      message: t.dictation.api.statsLoadFailed,
    },
  }
}

export async function GET(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseStatsSearchParams(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    if (parsed.data.scope === 'global')
      return NextResponse.json({
        stats: await getGlobalStatsForUser(actor.id),
      })

    return NextResponse.json({
      stats: await getVideoStatsForUser({
        userId: actor.id,
        videoId: parsed.data.videoId,
      }),
    })
  } catch (error) {
    return jsonError(toStatsError(error, t))
  }
}

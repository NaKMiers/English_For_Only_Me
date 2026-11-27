import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import { getVocabStatsForUser } from '@/modules/vocabulary/stats/vocabStatsService'
import {
  getMissingVocabMongoResponse,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET() {
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      stats: await getVocabStatsForUser({ userId: actor.id }),
    })
  } catch (error) {
    return jsonError(toVocabApiError(error, t))
  }
}

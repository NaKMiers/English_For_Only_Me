import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'
import { getGrammarStatsForActor } from '@/modules/grammar/stats/grammarStatsService'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET() {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json(
      await getGrammarStatsForActor({ actorId: actor.id })
    )
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

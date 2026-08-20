import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import { listGrammarPoints } from '@/modules/grammar/services/grammarPointListService'
import {
  getMissingGrammarMongoResponse,
  parseGrammarPointsQuery,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseGrammarPointsQuery(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json(await listGrammarPoints(parsed.data))
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { getGrammarDueQueue } from '@/modules/grammar/recall/dueQueueService'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarRecallDueRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseGrammarRecallDueRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      tasks: await getGrammarDueQueue({
        actorId: actor.id,
        limit: parsed.data.limit,
      }),
    })
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

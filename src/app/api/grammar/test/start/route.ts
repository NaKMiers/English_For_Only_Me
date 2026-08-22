import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarTestStartRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'
import {
  GrammarTestEmptyScopeError,
  GrammarTestRateLimitError,
  startGrammarTest,
} from '@/modules/grammar/test/testService'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Build an on-demand test.
 *
 * POST rather than GET even though it reads: it creates a session, spends money
 * at OpenAI, and carries a config object that does not belong in a query string.
 *
 * The two named errors get their own statuses because they mean different things
 * to the UI - 429 says wait, 400 says your filters matched nothing and the modal
 * should stay open so you can widen them.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json().catch(() => ({}))
    const parsed = parseGrammarTestStartRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json(
      await startGrammarTest({ actorId: actor.id, config: parsed.data }),
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof GrammarTestRateLimitError)
      return jsonError({ body: { message: error.message }, status: 429 })

    if (error instanceof GrammarTestEmptyScopeError)
      return jsonError({ body: { message: error.message }, status: 400 })

    return jsonError(toGrammarApiError(error))
  }
}

import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarTestSubmitRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'
import { submitGrammarTest } from '@/modules/grammar/test/testService'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Grade a whole test in one call.
 *
 * Safe to retry. The service claims the session with a conditional update, so a
 * second submit replays the stored report instead of applying the ladder twice.
 * A null return means the session does not belong to this learner or never
 * existed, which is a 404 rather than a 403 - the two are indistinguishable to
 * a caller who should not learn that someone else's session id is valid.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarTestSubmitRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const report = await submitGrammarTest({
      actorId: actor.id,
      answers: parsed.data.answers,
      sessionId: parsed.data.sessionId,
    })

    if (!report)
      return jsonError({
        body: { message: 'That test could not be found.' },
        status: 404,
      })

    return NextResponse.json(report)
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

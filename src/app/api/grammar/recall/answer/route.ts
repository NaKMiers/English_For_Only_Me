import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { submitGrammarAnswer } from '@/modules/grammar/recall/answerService'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarRecallAnswerRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * The client sends what was typed and nothing else. The server re-reads the
 * drill, grades it, and advances the ladder - and replays the original result
 * if this idempotency key has already been used.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarRecallAnswerRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const result = await submitGrammarAnswer({
      actorId: actor.id,
      answer: parsed.data.answer,
      drillId: parsed.data.drillId,
      idempotencyKey: parsed.data.idempotencyKey,
      pointSlug: parsed.data.slug,
      revealed: parsed.data.revealed,
    })

    if (!result)
      return jsonError({
        status: 409,
        body: {
          message: 'That drill is stale. Refresh your grammar recall queue.',
        },
      })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toGrammarApiError(error))
  }
}

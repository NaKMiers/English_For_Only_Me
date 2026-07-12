import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { submitVocabRecallAnswerForUser } from '@/modules/vocabulary/recall/recallAnswerService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseRecallAnswerRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function POST(request: Request) {
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseRecallAnswerRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const result = await submitVocabRecallAnswerForUser({
      action: parsed.data.action,
      idempotencyKey: parsed.data.idempotencyKey,
      selectedOptionId: parsed.data.selectedOptionId,
      token: parsed.data.token,
      userId: actor.id,
    })

    if (!result)
      return jsonError({
        status: 409,
        body: { message: 'This recall card is stale. Refresh recall.' },
      })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toVocabApiError(error))
  }
}

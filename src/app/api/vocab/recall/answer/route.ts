import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
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
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseRecallAnswerRequest(body, t)

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
        body: { message: t.vocabulary.api.staleRecallCard },
      })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.invalidJson },
      })

    return jsonError(toVocabApiError(error, t))
  }
}

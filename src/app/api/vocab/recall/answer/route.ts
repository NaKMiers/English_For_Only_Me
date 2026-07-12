import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import { answerVocabRecallForUser } from '@/modules/vocabulary/services/userVocabItemService'
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

    const item = await answerVocabRecallForUser({
      isCorrect: parsed.data.correct,
      itemId: parsed.data.itemId,
      userId: actor.id,
    })

    if (!item)
      return jsonError({
        status: 404,
        body: { message: 'This recall card was not found.' },
      })

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toVocabApiError(error))
  }
}

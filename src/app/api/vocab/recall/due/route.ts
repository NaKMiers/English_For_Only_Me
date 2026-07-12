import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import { listDueVocabRecallCardsForUser } from '@/modules/vocabulary/services/userVocabItemService'
import {
  getMissingVocabMongoResponse,
  parseRecallDueRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(request: Request) {
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseRecallDueRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      cards: await listDueVocabRecallCardsForUser({
        limit: parsed.data.limit,
        userId: actor.id,
      }),
    })
  } catch (error) {
    return jsonError(toVocabApiError(error))
  }
}

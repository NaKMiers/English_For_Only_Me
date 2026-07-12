import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import { setUserVocabItemStatus } from '@/modules/vocabulary/services/userVocabItemService'
import {
  getMissingVocabMongoResponse,
  parseItemStatusRequest,
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
    const parsed = parseItemStatusRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const item = await setUserVocabItemStatus({
      source: parsed.data.source,
      status: parsed.data.status,
      userId: actor.id,
      vocabEntryId: parsed.data.vocabEntryId,
    })

    if (!item)
      return jsonError({
        status: 404,
        body: { message: 'Vocabulary entry was not found.' },
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

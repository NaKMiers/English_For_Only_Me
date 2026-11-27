import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { searchVocabEntries } from '@/modules/vocabulary/services/vocabEntryService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseSearchRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseSearchRequest(new URL(request.url).searchParams, t)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      entries: await searchVocabEntries({
        limit: parsed.data.limit,
        query: parsed.data.q,
        userId: actor.id,
      }),
    })
  } catch (error) {
    return jsonError(toVocabApiError(error, t))
  }
}

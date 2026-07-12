import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { listExploreVocabEntriesForUser } from '@/modules/vocabulary/explore/exploreService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseExploreRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(request: Request) {
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseExploreRequest(new URL(request.url).searchParams)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      entries: await listExploreVocabEntriesForUser({
        limit: parsed.data.limit,
        userId: actor.id,
      }),
    })
  } catch (error) {
    return jsonError(toVocabApiError(error))
  }
}

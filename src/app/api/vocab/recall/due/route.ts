import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireUser } from '@/lib/auth/currentUser'
import { listDueVocabRecallTasksForUser } from '@/modules/vocabulary/recall/recallTaskService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
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
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseRecallDueRequest(new URL(request.url).searchParams, t)

  if (!parsed.ok) return jsonError(parsed)

  try {
    const user = await requireUser()

    await connectDatabase()

    return NextResponse.json(
      await listDueVocabRecallTasksForUser({
        cursor: parsed.data.cursor,
        excludeListening: parsed.data.excludeListening,
        limit: parsed.data.limit,
        userId: user.id,
      })
    )
  } catch (error) {
    return jsonError(toVocabApiError(error, t))
  }
}

import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireUser } from '@/lib/auth/currentUser'
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
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseItemStatusRequest(body, t)

    if (!parsed.ok) return jsonError(parsed)

    const user = await requireUser()

    await connectDatabase()

    const item = await setUserVocabItemStatus({
      source: parsed.data.source,
      status: parsed.data.status,
      userId: user.id,
      vocabEntryId: parsed.data.vocabEntryId,
    })

    if (!item)
      return jsonError({
        status: 404,
        body: { message: t.vocabulary.api.entryNotFound },
      })

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.invalidJson },
      })

    return jsonError(toVocabApiError(error, t))
  }
}

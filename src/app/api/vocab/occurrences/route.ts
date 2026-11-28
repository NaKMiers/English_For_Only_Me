import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { requireUser } from '@/lib/auth/currentUser'
import { recordVocabOccurrence } from '@/modules/vocabulary/services/userVocabItemService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseOccurrenceRecordRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Records one "met this word" event for an entry the browser already has
 * cached, so a repeat lookup does not re-run the dictionary read just to log
 * where the learner saw the word.
 */
export async function POST(request: Request) {
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseOccurrenceRecordRequest(body, t)

    if (!parsed.ok) return jsonError(parsed)

    const [user] = await Promise.all([requireUser(), connectDatabase()])
    const { occurrence, vocabEntryId } = parsed.data

    if (!(await VocabEntryModel.exists({ _id: vocabEntryId })))
      return jsonError({
        status: 404,
        body: { message: t.vocabulary.api.entryNotFound },
      })

    await recordVocabOccurrence({
      ...occurrence,
      userId: user.id,
      vocabEntryId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.invalidJson },
      })

    return jsonError(toVocabApiError(error, t))
  }
}

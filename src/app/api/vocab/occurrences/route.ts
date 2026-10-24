import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
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
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseOccurrenceRecordRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const [actor] = await Promise.all([
      requirePracticeActor(),
      connectDatabase(),
    ])
    const { occurrence, vocabEntryId } = parsed.data

    if (!(await VocabEntryModel.exists({ _id: vocabEntryId })))
      return jsonError({
        status: 404,
        body: { message: 'Vocabulary entry was not found.' },
      })

    await recordVocabOccurrence({
      ...occurrence,
      userId: actor.id,
      vocabEntryId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toVocabApiError(error))
  }
}

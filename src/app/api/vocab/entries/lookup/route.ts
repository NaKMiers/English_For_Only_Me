import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { enrichVocabEntryIfNeeded } from '@/modules/vocabulary/enrichment/enrichmentService'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  findOrCreateVocabEntryShell,
  getVocabEntryWithUserState,
} from '@/modules/vocabulary/services/vocabEntryService'
import { recordVocabOccurrence } from '@/modules/vocabulary/services/userVocabItemService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseLookupEntryRequest,
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
    const parsed = parseLookupEntryRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const shell = await findOrCreateVocabEntryShell({ term: parsed.data.term })

    if (!shell)
      return jsonError({
        status: 400,
        body: { message: 'Vocabulary term is invalid.' },
      })

    if (parsed.data.occurrence)
      await recordVocabOccurrence({
        ...parsed.data.occurrence,
        reason: parsed.data.occurrence.reason,
        selectedText: parsed.data.occurrence.selectedText ?? shell.term,
        userId: actor.id,
        vocabEntryId: shell.id,
      })

    const entry = await enrichVocabEntryIfNeeded({ entryId: shell.id })
    const record = await getVocabEntryWithUserState({
      entryId: entry?.id ?? shell.id,
      userId: actor.id,
    })

    if (!record)
      return jsonError({
        status: 404,
        body: { message: 'Vocabulary entry was not found.' },
      })

    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toVocabApiError(error))
  }
}

import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { enrichVocabEntryIfNeeded } from '@/modules/vocabulary/enrichment/enrichmentService'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { isEnglishTermCandidate } from '@/modules/vocabulary/normalizeVocabTerm'
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

    // Guard 1 (no API): reject input that is not an English word/phrase - other
    // scripts, digits, symbols - before creating anything or hitting a provider.
    if (!isEnglishTermCandidate(parsed.data.term))
      return jsonError({
        status: 400,
        body: { message: 'Enter an English word to look up.' },
      })

    const shell = await findOrCreateVocabEntryShell({ term: parsed.data.term })

    if (!shell)
      return jsonError({
        status: 400,
        body: { message: 'Vocabulary term is invalid.' },
      })

    const entry = await enrichVocabEntryIfNeeded({ entryId: shell.id })
    const resolved = entry ?? shell

    // Guard 2 (free dictionary result, never OpenAI): no definitions means no
    // English dictionary entry exists for this term - it is not a real English
    // word (e.g. "takuetsu", "ogre-faced"). Drop the empty shell we just created
    // (unless a user already saved it) so it never surfaces in search or lists,
    // and tell the caller instead of returning a hollow entry.
    if (resolved.definitions.length === 0) {
      const claimed = await UserVocabItemModel.exists({
        vocabEntryId: resolved.id,
      })

      if (!claimed) await VocabEntryModel.deleteOne({ _id: resolved.id })

      return jsonError({
        status: 404,
        body: {
          message: `No English dictionary entry found for "${shell.term}".`,
        },
      })
    }

    // Valid English word - only now record where the user encountered it.
    if (parsed.data.occurrence)
      await recordVocabOccurrence({
        ...parsed.data.occurrence,
        reason: parsed.data.occurrence.reason,
        selectedText: parsed.data.occurrence.selectedText ?? shell.term,
        userId: actor.id,
        vocabEntryId: resolved.id,
      })

    const record = await getVocabEntryWithUserState({
      entryId: resolved.id,
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

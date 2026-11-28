import { after, NextResponse } from 'next/server'

import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { UserVocabItemModel } from '@/models/vocabulary/UserVocabItemModel'
import { VocabEntryModel } from '@/models/vocabulary/VocabEntryModel'
import { enrichVocabEntryIfNeeded } from '@/modules/vocabulary/enrichment/enrichmentService'
import { requireUser } from '@/lib/auth/currentUser'
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
  const t = await getMessages()
  const missingMongo = getMissingVocabMongoResponse(t)

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseLookupEntryRequest(body, t)

    if (!parsed.ok) return jsonError(parsed)

    const user = await requireUser()

    await connectDatabase()

    // Guard 1 (no API): reject input that is not an English word/phrase - other
    // scripts, digits, symbols - before creating anything or hitting a provider.
    if (!isEnglishTermCandidate(parsed.data.term))
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.notEnglish },
      })

    const shell = await findOrCreateVocabEntryShell({ term: parsed.data.term })

    if (!shell)
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.invalidTerm },
      })

    const entry = await enrichVocabEntryIfNeeded({ entryId: shell.id })
    const resolved = entry ?? shell

    // Guard 2 (free dictionary result, never the AI model): no definitions means no
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
          message: format(t.vocabulary.api.noDictionaryEntry, {
            term: shell.term,
          }),
        },
      })
    }

    // Valid English word - only now record where the user encountered it.
    // The write runs after the response is sent: it is side data the learner
    // never waits on, recorded once per lookup like before.
    const { occurrence } = parsed.data

    if (occurrence)
      after(() =>
        recordVocabOccurrence({
          ...occurrence,
          reason: occurrence.reason,
          selectedText: occurrence.selectedText ?? shell.term,
          userId: user.id,
          vocabEntryId: resolved.id,
        }).catch(error => {
          console.error('Vocabulary occurrence write failed', error)
        })
      )

    const record = await getVocabEntryWithUserState({
      entryId: resolved.id,
      userId: user.id,
    })

    if (!record)
      return jsonError({
        status: 404,
        body: { message: t.vocabulary.api.entryNotFound },
      })

    return NextResponse.json(record)
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: t.vocabulary.api.invalidJson },
      })

    return jsonError(toVocabApiError(error, t))
  }
}

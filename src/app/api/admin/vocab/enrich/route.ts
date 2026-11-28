import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/lib/auth/currentUser'
import {
  enrichNextVocabularyEntries,
  getVocabAdminQueueSummary,
} from '@/modules/vocabulary/enrichment/enrichmentService'
import { toVocabApiError } from '@/modules/vocabulary/services/vocabApiErrors'
import {
  getMissingVocabMongoResponse,
  parseAdminEnrichRequest,
  type VocabApiErrorDecision,
} from '@/modules/vocabulary/services/vocabularyRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: VocabApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET() {
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    await requireAdmin()
    await connectDatabase()

    return NextResponse.json({
      queue: await getVocabAdminQueueSummary(),
    })
  } catch (error) {
    return jsonError(toVocabApiError(error))
  }
}

export async function POST(request: Request) {
  const missingMongo = getMissingVocabMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body = await request.json()
    const parsed = parseAdminEnrichRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    await requireAdmin()
    await connectDatabase()

    const result = await enrichNextVocabularyEntries({
      limit: parsed.data.limit,
    })

    return NextResponse.json({
      result,
      queue: await getVocabAdminQueueSummary(),
    })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: (await getMessages()).admin.api.invalidJson },
      })

    return jsonError(toVocabApiError(error))
  }
}

import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import { getGrammarLesson } from '@/modules/grammar/services/grammarPointListService'
import {
  getMissingGrammarMongoResponse,
  parseGrammarPointSlug,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseGrammarPointSlug((await params).slug)

  if (!parsed.ok) return jsonError(parsed)

  try {
    await requirePracticeActor()

    await connectDatabase()

    const lesson = await getGrammarLesson(parsed.data.slug)

    if (!lesson)
      return jsonError({
        status: 404,
        body: { message: 'Grammar point not found.' },
      })

    return NextResponse.json({ lesson })
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

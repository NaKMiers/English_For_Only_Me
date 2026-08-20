import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarItemStatusRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'
import { setGrammarItemStatus } from '@/modules/grammar/services/userGrammarItemService'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarItemStatusRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    const item = await setGrammarItemStatus({
      actorId: actor.id,
      pointSlug: parsed.data.slug,
      status: parsed.data.status,
    })

    if (!item)
      return jsonError({
        status: 404,
        body: { message: 'Grammar point not found.' },
      })

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toGrammarApiError(error))
  }
}

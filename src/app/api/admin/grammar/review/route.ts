import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import { toGrammarPointRecord } from '@/modules/grammar/services/grammarPointRecords'
import {
  getMissingGrammarMongoResponse,
  parseGrammarReviewRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/**
 * Mark a generated lesson as human-reviewed, which clears its unverified
 * banner. The banner is the whole point of `reviewStatus`: bulk AI-written
 * grammar explanations are exactly the thing you must not study from without
 * knowing nobody has checked them.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarReviewRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    await requireAdmin()

    await connectDatabase()

    const point = await GrammarPointModel.findOneAndUpdate(
      { slug: parsed.data.slug },
      {
        reviewStatus: parsed.data.reviewStatus,
        reviewedAt: parsed.data.reviewStatus === 'reviewed' ? new Date() : null,
      },
      { new: true }
    ).lean()

    if (!point)
      return jsonError({
        status: 404,
        body: { message: 'Grammar point not found.' },
      })

    return NextResponse.json({ point: toGrammarPointRecord(point) })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toGrammarApiError(error))
  }
}

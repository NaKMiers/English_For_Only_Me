import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
import {
  buildGrammarDiagnostic,
  submitGrammarDiagnostic,
} from '@/modules/grammar/diagnostic/diagnosticService'
import { toGrammarApiError } from '@/modules/grammar/services/grammarApiErrors'
import {
  getMissingGrammarMongoResponse,
  parseGrammarDiagnosticBuildRequest,
  parseGrammarDiagnosticSubmitRequest,
  type GrammarApiErrorDecision,
} from '@/modules/grammar/services/grammarRouteDecisions'

export const runtime = 'nodejs'

function jsonError(decision: GrammarApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

/** Build a placement diagnostic weighted toward high L1-transfer risk. */
export async function GET(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const parsed = parseGrammarDiagnosticBuildRequest(
    new URL(request.url).searchParams
  )

  if (!parsed.ok) return jsonError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json({
      items: await buildGrammarDiagnostic({
        actorId: actor.id,
        limit: parsed.data.limit,
      }),
    })
  } catch (error) {
    return jsonError(toGrammarApiError(error))
  }
}

/**
 * Submit a whole diagnostic. Every answer is graded server-side and seeds a
 * starting ladder position rather than a binary known/unknown verdict.
 */
export async function POST(request: Request) {
  const missingMongo = getMissingGrammarMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  try {
    const body: unknown = await request.json()
    const parsed = parseGrammarDiagnosticSubmitRequest(body)

    if (!parsed.ok) return jsonError(parsed)

    const actor = await requirePracticeActor()

    await connectDatabase()

    return NextResponse.json(
      await submitGrammarDiagnostic({
        actorId: actor.id,
        answers: parsed.data.answers,
        sessionKey: parsed.data.sessionKey,
      })
    )
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: 'Request body must be valid JSON.' },
      })

    return jsonError(toGrammarApiError(error))
  }
}

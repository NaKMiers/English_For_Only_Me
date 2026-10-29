import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseStartAttempt } from '@/modules/ielts/attempts/attemptRouteDecisions'
import { startOrResumeAttempt } from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

/**
 * Start or resume an attempt. Idempotent on `idempotencyKey`; an open
 * attempt for the same test, skill, mode and scope is resumed instead of
 * creating a second one.
 */
export async function POST(request: Request) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseStartAttempt(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    const outcome = await startOrResumeAttempt({
      input: parsed.data,
      ownerId: actor.id,
    })

    if (!outcome.ok) return ieltsDecisionError(outcome)

    return NextResponse.json(outcome.data, {
      status: outcome.data.mode === 'created' ? 201 : 200,
    })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts attempt start failed')
  }
}

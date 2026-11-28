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
import { requireUser } from '@/lib/auth/currentUser'

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
    const user = await requireUser()

    await connectDatabase()

    const outcome = await startOrResumeAttempt({
      input: parsed.data,
      ownerId: user.id,
    })

    if (!outcome.ok) return ieltsDecisionError(outcome)

    return NextResponse.json(outcome.data, {
      status: outcome.data.mode === 'created' ? 201 : 200,
    })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts attempt start failed')
  }
}

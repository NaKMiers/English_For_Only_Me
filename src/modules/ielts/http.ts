import 'server-only'

import { NextResponse } from 'next/server'

import { getMessages } from '@/i18n/server'
import { authErrorResponse } from '@/lib/auth/authErrorMessage'
import { getMissingMongoResponse } from '@/modules/dictation/services/videoRouteDecisions'

import {
  formatIeltsApiMessage,
  type IeltsApiError,
  type IeltsApiMessageKey,
  type IeltsDecision,
} from './attempts/attemptRouteDecisions'

/*
 * Shared plumbing for the IELTS route handlers, so every route follows the
 * same order: Mongo configured, JSON body, Zod decision, actor, service,
 * `{ message }` errors with an explicit status. A learner-facing message
 * (one with a catalogue key) is sent in the learner's language.
 */

export function ieltsJsonError(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

export async function ieltsDecisionError(decision: IeltsApiError) {
  if (!decision.messageKey)
    return NextResponse.json(decision.body, { status: decision.status })

  const t = await getMessages()

  return ieltsJsonError(
    decision.status,
    formatIeltsApiMessage(t.ielts, decision.messageKey, decision.messageValues)
  )
}

/** 500 with a message when MONGODB_URI is missing, else null. */
export function ieltsMissingMongo() {
  const missing = getMissingMongoResponse()

  return missing ? NextResponse.json(missing.body, { status: 503 }) : null
}

export async function readJsonBody(
  request: Request
): Promise<IeltsDecision<unknown>> {
  try {
    return { ok: true, data: await request.json() }
  } catch {
    return {
      ok: false,
      status: 400,
      body: { message: 'Request body must be valid JSON.' },
    }
  }
}

/** Maps the auth seam errors to their status; anything else is a 500. */
export async function ieltsRouteFailure(
  error: unknown,
  context: string,
  fallback: IeltsApiMessageKey = 'generic'
) {
  const t = await getMessages()
  const auth = authErrorResponse(error, t)

  if (auth) return ieltsJsonError(auth.status, auth.message)

  console.error(context, { error })

  return ieltsJsonError(500, t.ielts.apiErrors[fallback])
}

export async function ieltsDecisionResponse<T>(
  decision: IeltsDecision<T>,
  map: (data: T) => unknown = data => data
) {
  if (!decision.ok) return ieltsDecisionError(decision)

  return NextResponse.json(map(decision.data))
}

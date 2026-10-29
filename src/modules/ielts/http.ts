import 'server-only'

import { NextResponse } from 'next/server'

import { OutboxOwnerMismatchError } from '@/lib/auth/clientOwnerKey'
import {
  ForbiddenError,
  UnauthenticatedError,
} from '@/modules/dictation/services/getCurrentUser'
import { getMissingMongoResponse } from '@/modules/dictation/services/videoRouteDecisions'

import type {
  IeltsApiError,
  IeltsDecision,
} from './attempts/attemptRouteDecisions'

/*
 * Shared plumbing for the IELTS route handlers, so every route follows the
 * same order: Mongo configured, JSON body, Zod decision, actor, service,
 * `{ message }` errors with an explicit status.
 */

export function ieltsJsonError(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

export function ieltsDecisionError(decision: IeltsApiError) {
  return NextResponse.json(decision.body, { status: decision.status })
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
export function ieltsRouteFailure(
  error: unknown,
  context: string,
  fallback = 'Something went wrong. Try again later.'
) {
  if (
    error instanceof OutboxOwnerMismatchError ||
    error instanceof UnauthenticatedError ||
    error instanceof ForbiddenError
  )
    return ieltsJsonError(error.status, error.message)

  console.error(context, { error })

  return ieltsJsonError(500, fallback)
}

export function ieltsDecisionResponse<T>(
  decision: IeltsDecision<T>,
  map: (data: T) => unknown = data => data
) {
  if (!decision.ok) return ieltsDecisionError(decision)

  return NextResponse.json(map(decision.data))
}

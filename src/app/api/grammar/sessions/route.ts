import { NextResponse } from 'next/server'

import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { authErrorResponse } from '@/lib/auth/authErrorMessage'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireUser } from '@/lib/auth/currentUser'
import { parseSessionRequest } from '@/modules/grammar/session/parseSessionRequest'
import { recordGrammarSession } from '@/modules/grammar/services/grammarProgressService'

export const runtime = 'nodejs'

function jsonError(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

/**
 * Record one finished grammar session (lesson, review, checkpoint, or weak
 * spots). The client sends raw first answers only; the server re-grades them,
 * applies stars/unlocks/ladder/misses, and returns the verdict. Safe to retry
 * with the same idempotency key.
 */
export async function POST(request: Request) {
  const messages = await getMessages()
  const t = messages.grammar.api

  if (!hasMongoDbUri()) return jsonError(503, t.notConfigured)

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError(400, t.invalidJson)
  }

  const parsed = parseSessionRequest(body)

  if (!parsed.ok) return jsonError(400, t.invalidResult)

  try {
    const user = await requireUser()

    await connectDatabase()

    const outcome = await recordGrammarSession({
      actorId: user.id,
      idempotencyKey: parsed.idempotencyKey,
      submission: parsed.submission,
    })

    if (!outcome.ok) {
      // Structured so a "finished but not saved" report can be traced.
      console.warn('grammar session rejected', {
        message: outcome.message,
        mode: parsed.submission.mode,
        status: outcome.status,
        targetId: parsed.submission.targetId,
      })

      return jsonError(outcome.status, t.errors[outcome.code])
    }

    return NextResponse.json(outcome.result)
  } catch (error) {
    // Signed out (the outbox holds the write and sends the tab to the login
    // page), or queued in a tab for another learner: final either way.
    const auth = authErrorResponse(error, messages)

    if (auth) return jsonError(auth.status, auth.message)

    console.error('grammar session failed', {
      error,
      mode: parsed.submission.mode,
      targetId: parsed.submission.targetId,
    })

    return jsonError(500, t.saveFailed)
  }
}

import { NextResponse } from 'next/server'

import { hasMongoDbUri } from '@/constants/environments'
import { OutboxOwnerMismatchError } from '@/lib/auth/clientOwnerKey'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'
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
  if (!hasMongoDbUri()) return jsonError(503, 'Chưa cấu hình cơ sở dữ liệu.')

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError(400, 'Request body must be valid JSON.')
  }

  const parsed = parseSessionRequest(body)

  if (!parsed.ok) return jsonError(400, parsed.message)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    const outcome = await recordGrammarSession({
      actorId: actor.id,
      idempotencyKey: parsed.idempotencyKey,
      submission: parsed.submission,
    })

    if (!outcome.ok) {
      // Structured so a "finished but not saved" report can be traced.
      console.warn('grammar session rejected', {
        actor: actor.isGuest ? 'guest' : 'user',
        message: outcome.message,
        mode: parsed.submission.mode,
        status: outcome.status,
        targetId: parsed.submission.targetId,
      })

      return jsonError(outcome.status, outcome.message)
    }

    return NextResponse.json(outcome.result)
  } catch (error) {
    // Queued in a tab for another learner (signed in or out since): final, so
    // the outbox settles it instead of retrying.
    if (error instanceof OutboxOwnerMismatchError)
      return jsonError(error.status, error.message)

    console.error('grammar session failed', {
      error,
      mode: parsed.submission.mode,
      targetId: parsed.submission.targetId,
    })

    return jsonError(500, 'Không lưu được bài làm. Thử lại sau nhé.')
  }
}

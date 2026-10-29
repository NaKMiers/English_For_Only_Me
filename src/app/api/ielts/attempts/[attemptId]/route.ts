import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseAttemptId } from '@/modules/ielts/attempts/attemptRouteDecisions'
import { readAttemptForOwner } from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsJsonError,
  ieltsMissingMongo,
  ieltsRouteFailure,
} from '@/modules/ielts/http'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ attemptId: string }>
}

/** The owner's attempt (result included once submitted). */
export async function GET(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    const attempt = await readAttemptForOwner(actor.id, id.data)

    if (!attempt) return ieltsJsonError(404, 'Attempt not found.')

    return NextResponse.json({ attempt })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts attempt read failed')
  }
}

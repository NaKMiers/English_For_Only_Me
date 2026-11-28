import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  ieltsMessageError,
  parseAttemptId,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import {
  deleteAttemptForOwner,
  readAttemptForOwner,
} from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsMissingMongo,
  ieltsRouteFailure,
} from '@/modules/ielts/http'
import { requireUser } from '@/lib/auth/currentUser'

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
    const user = await requireUser()

    await connectDatabase()

    const attempt = await readAttemptForOwner(user.id, id.data)

    if (!attempt)
      return ieltsDecisionError(ieltsMessageError(404, 'attemptNotFound'))

    return NextResponse.json({ attempt })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts attempt read failed')
  }
}

/** Delete one of the owner's attempts and everything stored on it. */
export async function DELETE(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    const user = await requireUser()

    await connectDatabase()

    const deleted = await deleteAttemptForOwner(user.id, id.data)

    if (!deleted)
      return ieltsDecisionError(ieltsMessageError(404, 'attemptNotFound'))

    return NextResponse.json({ deleted: true })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts attempt delete failed')
  }
}

import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsJsonError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import {
  parseSaveMeta,
  parseTestId,
} from '@/modules/ielts/tests/testRouteDecisions'
import {
  deleteDraft,
  readAdminTest,
  saveTestMeta,
} from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    await requireAdmin()
    await connectDatabase()

    const test = await readAdminTest(id.data)

    if (!test) return ieltsJsonError(404, 'Test not found.')

    return NextResponse.json({ test })
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin read failed')
  }
}

/** Metadata (title, track, target band, tags, description) with revision. */
export async function PUT(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseSaveMeta(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(
      await saveTestMeta({ testId: id.data, ...parsed.data }),
      test => ({ test })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin meta save failed')
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(await deleteDraft(id.data))
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin delete failed')
  }
}

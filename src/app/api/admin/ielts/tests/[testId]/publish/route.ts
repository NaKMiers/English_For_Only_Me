import { NextResponse } from 'next/server'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import {
  parsePublish,
  parseTestId,
} from '@/modules/ielts/tests/testRouteDecisions'
import { publishTest } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/**
 * Publish a draft. 422 carries the consistency report (errors, or warnings
 * still to confirm).
 */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)
  const parsed = parsePublish(body.ok ? body.data : {})

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    await requireAdmin()
    await connectDatabase()

    const outcome = await publishTest({
      confirmWarnings: parsed.data.confirmWarnings,
      testId: id.data,
    })

    if (!outcome.ok)
      return NextResponse.json(outcome.body, { status: outcome.status })

    return NextResponse.json(outcome.data)
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin publish failed')
  }
}

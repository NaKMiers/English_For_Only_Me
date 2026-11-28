import { NextResponse } from 'next/server'

import { plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/lib/auth/currentUser'
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
import type { IeltsConsistencyReport } from '@/modules/ielts/consistency/checkTest'
import { publishTest } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

/** Why the publish stopped, in the admin's language. */
function blockedMessage(report: IeltsConsistencyReport, t: Messages) {
  return report.errors.length
    ? plural(t.ieltsEditor.api.publishErrors, report.errors.length)
    : plural(t.ieltsEditor.api.publishWarnings, report.warnings.length)
}

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
      return 'report' in outcome.body
        ? NextResponse.json(
            {
              ...outcome.body,
              message: blockedMessage(outcome.body.report, await getMessages()),
            },
            { status: outcome.status }
          )
        : ieltsDecisionError(outcome)

    return NextResponse.json(outcome.data)
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin publish failed')
  }
}

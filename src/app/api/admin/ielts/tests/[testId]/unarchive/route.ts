import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
} from '@/modules/ielts/http'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import { unarchiveTest } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/** Put an archived test back on the catalogue. */
export async function POST(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(await unarchiveTest(id.data), test => ({
      test,
    }))
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin unarchive failed')
  }
}

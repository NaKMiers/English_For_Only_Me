import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
} from '@/modules/ielts/http'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import { createNewVersion } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string }>
}

/** Copy a published or archived version into a new draft. */
export async function POST(_request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseTestId((await context.params).testId)

  if (!id.ok) return ieltsDecisionError(id)

  try {
    const admin = await requireAdmin()

    await connectDatabase()

    return ieltsDecisionResponse(
      await createNewVersion(id.data, admin.email ?? admin.id),
      test => ({ test })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin new version failed')
  }
}

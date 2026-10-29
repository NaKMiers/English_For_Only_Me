import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import {
  parseSaveSection,
  parseSectionKey,
  parseTestId,
} from '@/modules/ielts/tests/testRouteDecisions'
import { saveTestSection } from '@/modules/ielts/tests/testService'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ testId: string; key: string }>
}

/** Save one draft section; 409 when its revision moved on. */
export async function PUT(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const params = await context.params
  const id = parseTestId(params.testId)

  if (!id.ok) return ieltsDecisionError(id)

  const key = parseSectionKey(params.key)

  if (!key.ok) return ieltsDecisionError(key)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseSaveSection(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(
      await saveTestSection({
        input: parsed.data.section,
        key: key.data,
        revision: parsed.data.revision,
        testId: id.data,
      }),
      test => ({ test })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin section save failed')
  }
}

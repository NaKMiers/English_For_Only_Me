import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseStartDrill } from '@/modules/ielts/attempts/attemptRouteDecisions'
import { startDrill } from '@/modules/ielts/drill/drillService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { requireUser } from '@/lib/auth/currentUser'

export const runtime = 'nodejs'

/** Start a drill of one question type. */
export async function POST(request: Request) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseStartDrill(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const user = await requireUser()

    await connectDatabase()

    return ieltsDecisionResponse(
      await startDrill({ input: parsed.data, ownerId: user.id }),
      attempt => ({ attempt })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts drill start failed')
  }
}

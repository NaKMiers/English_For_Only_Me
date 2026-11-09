import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseCheckPart,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { checkPracticePart } from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ attemptId: string }>
}

/** Practice: check one part's answers before the whole test is submitted. */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseCheckPart(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await checkPracticePart({
        ...parsed.data,
        attemptId: id.data,
        ownerId: actor.id,
      })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts part check failed')
  }
}

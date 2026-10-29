import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseSaveAnswers,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { saveAttemptAnswers } from '@/modules/ielts/attempts/attemptService'
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

/**
 * Autosave: the full answers snapshot with a growing `seq`. A stale seq is a
 * 200 with `applied: false`; only "time is up" is a 409.
 */
export async function PUT(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseSaveAnswers(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await saveAttemptAnswers({
        answers: parsed.data.answers,
        attemptId: id.data,
        ownerId: actor.id,
        seq: parsed.data.seq,
      })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts answers save failed')
  }
}

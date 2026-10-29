import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseSubmitAttempt,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { submitAttempt } from '@/modules/ielts/attempts/attemptService'
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
 * Submit with the final snapshot. Safe to replay: a submitted attempt
 * returns its stored result.
 */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseSubmitAttempt(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await submitAttempt({
        answers: parsed.data.answers,
        attemptId: id.data,
        ownerId: actor.id,
        seq: parsed.data.seq,
      }),
      attempt => ({ attempt })
    )
  } catch (error) {
    return ieltsRouteFailure(
      error,
      'ielts attempt submit failed',
      'Không nộp được bài. Thử lại sau nhé.'
    )
  }
}

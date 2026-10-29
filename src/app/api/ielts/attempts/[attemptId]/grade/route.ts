import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseGradeWriting,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { gradeWritingTask } from '@/modules/ielts/writing/gradeWritingService'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'
// One examiner request (aborted at 240 s) fits inside this.
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ attemptId: string }>
}

/** AI feedback for one task of a submitted writing attempt. */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseGradeWriting(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await gradeWritingTask({
        attemptId: id.data,
        isGuest: actor.isGuest,
        ownerId: actor.id,
        task: parsed.data.task,
      }),
      attempt => ({ attempt })
    )
  } catch (error) {
    return ieltsRouteFailure(
      error,
      'ielts writing grade failed',
      'Không chấm được bài. Thử lại sau nhé.'
    )
  }
}

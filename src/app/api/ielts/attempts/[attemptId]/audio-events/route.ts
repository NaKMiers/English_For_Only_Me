import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseAudioEvent,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { recordAudioEvent } from '@/modules/ielts/attempts/attemptService'
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

/** Listening mock clock: a part started, or the audio was interrupted. */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseAudioEvent(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await recordAudioEvent({
        attemptId: id.data,
        event: parsed.data,
        ownerId: actor.id,
      }),
      attempt => ({ attempt })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts audio event failed')
  }
}

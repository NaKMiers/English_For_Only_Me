import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseEvidenceNumber,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { readPracticeEvidence } from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
} from '@/modules/ielts/http'
import { requirePracticeActor } from '@/modules/dictation/services/getCurrentUser'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ attemptId: string }>
}

/** Guided mode: where the answer to one question sits (practice only). */
export async function GET(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const number = parseEvidenceNumber(
    new URL(request.url).searchParams.get('number')
  )

  if (!number.ok) return ieltsDecisionError(number)

  try {
    const actor = await requirePracticeActor()

    await connectDatabase()

    return ieltsDecisionResponse(
      await readPracticeEvidence({
        attemptId: id.data,
        number: number.data,
        ownerId: actor.id,
      })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts evidence read failed')
  }
}

import { getLocale } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  parseAttemptId,
  parseCheckPractice,
} from '@/modules/ielts/attempts/attemptRouteDecisions'
import { checkPracticePart } from '@/modules/ielts/attempts/attemptService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { checkPracticeWriting } from '@/modules/ielts/writing/gradeWritingService'
import { requireUser } from '@/lib/auth/currentUser'

export const runtime = 'nodejs'
// A writing check is one examiner request (aborted at 240 s).
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ attemptId: string }>
}

/**
 * Practice check before the whole test is submitted: one Listening/Reading
 * part graded from the answers on screen (`{ answers, part }`), or AI
 * feedback on one Writing task (`{ task, essay }`).
 */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const id = parseAttemptId((await context.params).attemptId)

  if (!id.ok) return ieltsDecisionError(id)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = parseCheckPractice(body.data)

  if (!parsed.ok) return ieltsDecisionError(parsed)

  try {
    const user = await requireUser()
    const input = parsed.data

    await connectDatabase()

    if ('part' in input)
      return ieltsDecisionResponse(
        await checkPracticePart({
          ...input,
          attemptId: id.data,
          ownerId: user.id,
        })
      )

    return ieltsDecisionResponse(
      await checkPracticeWriting({
        attemptId: id.data,
        essay: input.essay,
        ownerId: user.id,
        task: input.task,
        language: await getLocale(),
      }),
      feedback => ({ feedback })
    )
  } catch (error) {
    return ieltsRouteFailure(
      error,
      'ielts practice check failed',
      'checkFailed'
    )
  }
}

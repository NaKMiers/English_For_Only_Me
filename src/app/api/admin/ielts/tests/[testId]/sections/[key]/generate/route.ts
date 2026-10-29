import { z } from 'zod'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import { generateSectionStep } from '@/modules/ielts/generation/generationService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsJsonError,
  ieltsMissingMongo,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import {
  parseSectionKey,
  parseTestId,
} from '@/modules/ielts/tests/testRouteDecisions'

export const runtime = 'nodejs'
// One OpenAI request per call, aborted at 240 s.
export const maxDuration = 300

const generateSchema = z
  .object({
    step: z.enum(['draft', 'repair', 'script', 'questions']),
    revision: z.number().int().min(0),
  })
  .strict()

interface RouteContext {
  params: Promise<{ testId: string; key: string }>
}

/** One generation step for one draft section. */
export async function POST(request: Request, context: RouteContext) {
  const missing = ieltsMissingMongo()

  if (missing) return missing

  const params = await context.params
  const id = parseTestId(params.testId)

  if (!id.ok) return ieltsDecisionError(id)

  const key = parseSectionKey(params.key)

  if (!key.ok) return ieltsDecisionError(key)

  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = generateSchema.safeParse(body.data)

  if (!parsed.success) return ieltsJsonError(400, 'Invalid generate request.')

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(
      await generateSectionStep({
        key: key.data,
        revision: parsed.data.revision,
        step: parsed.data.step,
        testId: id.data,
      })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin generate failed')
  }
}

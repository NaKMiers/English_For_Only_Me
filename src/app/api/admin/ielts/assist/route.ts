import { z } from 'zod'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  assistSection,
  IELTS_ASSIST_ACTIONS,
} from '@/modules/ielts/generation/assistService'
import {
  ieltsDecisionError,
  ieltsDecisionResponse,
  ieltsJsonError,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'
import { IELTS_SECTION_KEYS } from '@/modules/ielts/constants'
import { ieltsSectionInputSchema } from '@/modules/ielts/schema'

export const runtime = 'nodejs'
export const maxDuration = 300

const assistSchema = z
  .object({
    action: z.enum(IELTS_ASSIST_ACTIONS),
    testId: z.string().min(1).max(40),
    key: z.enum(IELTS_SECTION_KEYS),
    section: ieltsSectionInputSchema,
    instruction: z.string().max(1000).default(''),
  })
  .strict()

/** An AI proposal for the section being edited (nothing is saved). */
export async function POST(request: Request) {
  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = assistSchema.safeParse(body.data)

  if (!parsed.success)
    return ieltsJsonError(
      400,
      parsed.error.issues[0]?.message ?? 'Invalid assist request.'
    )

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(
      await assistSection({
        action: parsed.data.action,
        instruction: parsed.data.instruction,
        key: parsed.data.key,
        section: parsed.data.section,
      }),
      proposal => ({ proposal })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin assist failed')
  }
}

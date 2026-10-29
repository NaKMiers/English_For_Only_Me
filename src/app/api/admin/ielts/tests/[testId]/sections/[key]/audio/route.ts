import { z } from 'zod'

import { connectDatabase } from '@/lib/db/connectDatabase'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import { generateSectionAudio } from '@/modules/ielts/audio/audioService'
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
// TTS for one part plus the upload, aborted at 240 s.
export const maxDuration = 300

const audioSchema = z.object({ revision: z.number().int().min(0) }).strict()

interface RouteContext {
  params: Promise<{ testId: string; key: string }>
}

/** Generate the audio for one listening part of a draft. */
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

  const parsed = audioSchema.safeParse(body.data)

  if (!parsed.success) return ieltsJsonError(400, 'revision is required.')

  try {
    await requireAdmin()
    await connectDatabase()

    return ieltsDecisionResponse(
      await generateSectionAudio({
        key: key.data,
        revision: parsed.data.revision,
        testId: id.data,
      })
    )
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts admin audio failed')
  }
}

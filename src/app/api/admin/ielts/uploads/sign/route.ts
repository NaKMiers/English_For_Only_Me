import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createSignedUploadParams } from '@/lib/cloudinary/uploadAudio'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  ieltsDecisionError,
  ieltsJsonError,
  ieltsRouteFailure,
  readJsonBody,
} from '@/modules/ielts/http'

export const runtime = 'nodejs'

const signSchema = z.object({ kind: z.enum(['audio', 'image']) }).strict()

/** Signed params for a direct browser upload of a manual mp3 or an image. */
export async function POST(request: Request) {
  const body = await readJsonBody(request)

  if (!body.ok) return ieltsDecisionError(body)

  const parsed = signSchema.safeParse(body.data)

  if (!parsed.success)
    return ieltsJsonError(400, 'kind must be audio or image.')

  try {
    await requireAdmin()

    return NextResponse.json(createSignedUploadParams(parsed.data.kind))
  } catch (error) {
    return ieltsRouteFailure(error, 'ielts upload sign failed')
  }
}

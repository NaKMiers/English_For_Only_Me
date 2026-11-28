import { NextResponse } from 'next/server'
import { z } from 'zod'

import { MissingEnvironmentError } from '@/constants/environments'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { translateSegmentText } from '@/lib/ai/qwenTranslate'
import { DictationSegmentModel } from '@/models/dictation/DictationSegmentModel'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { requireAdmin } from '@/modules/dictation/services/getCurrentUser'
import {
  getLanguageLabel,
  normalizeTranslationLanguage,
} from '@/modules/dictation/translations/languages'
import {
  getAccessErrorMessage,
  type ApiErrorDecision,
  getMissingMongoResponse,
  MISSING_MONGODB_MESSAGE,
} from '@/modules/dictation/services/videoRouteDecisions'

export const runtime = 'nodejs'

interface RouteContext {
  params: Promise<{ segmentId: string }>
}

const translateRequestSchema = z
  .object({
    language: z.string().trim().min(2).max(20),
  })
  .strict()

function jsonError(decision: ApiErrorDecision) {
  return NextResponse.json(decision.body, { status: decision.status })
}

function toTranslateError(error: unknown, t: Messages): ApiErrorDecision {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error.status === 401 || error.status === 403 || error.status === 409)
  )
    return {
      status: error.status,
      body: {
        message: getAccessErrorMessage(error.status, t),
      },
    }

  if (error instanceof MissingEnvironmentError)
    return { status: 500, body: { message: MISSING_MONGODB_MESSAGE } }

  console.error('Failed to translate dictation segment', error)

  return {
    status: 500,
    body: { message: t.dictation.api.segmentTranslateFailed },
  }
}

export async function POST(request: Request, context: RouteContext) {
  const t = await getMessages()
  const missingMongo = getMissingMongoResponse()

  if (missingMongo) return jsonError(missingMongo)

  const { segmentId } = await context.params

  if (!/^[a-f\d]{24}$/i.test(segmentId))
    return jsonError({
      status: 400,
      body: { message: t.dictation.api.invalidSegmentId },
    })

  try {
    const body = await request.json()
    const parsed = translateRequestSchema.safeParse(body)

    if (!parsed.success)
      return jsonError({
        status: 400,
        body: { message: t.dictation.api.targetLanguageRequired },
      })

    await requireAdmin()

    await connectDatabase()

    const segment = await DictationSegmentModel.findOne({
      _id: segmentId,
    }).lean()

    if (!segment)
      return jsonError({
        status: 404,
        body: { message: t.dictation.api.segmentNotFound },
      })

    const video = await DictationVideoModel.findOne({
      _id: segment.videoId,
    })
      .select({ defaultLanguage: 1 })
      .lean()

    const language = normalizeTranslationLanguage(parsed.data.language)
    const primaryLanguage = normalizeTranslationLanguage(
      video?.defaultLanguage ?? 'en'
    )

    if (language === primaryLanguage)
      return jsonError({
        status: 400,
        body: {
          message: t.dictation.api.primaryLanguageNotTranslatable,
        },
      })

    const result = await translateSegmentText({
      languageLabel: getLanguageLabel(language),
      text: segment.text,
    })

    if (!result.ok)
      return jsonError({ status: 503, body: { message: result.message } })

    return NextResponse.json({ translation: result.translation })
  } catch (error) {
    if (error instanceof SyntaxError)
      return jsonError({
        status: 400,
        body: { message: t.dictation.api.invalidJson },
      })

    return jsonError(toTranslateError(error, t))
  }
}

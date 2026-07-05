import { z } from 'zod'

import type { ApiErrorDecision } from '@/modules/dictation/services/videoRouteDecisions'

import {
  DEFAULT_TRANSLATION_LANGUAGE,
  isSupportedTranslationLanguage,
  type SupportedTranslationLanguage,
} from './languages'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const translationPayloadSchema = z
  .object({
    segmentId: objectIdSchema,
    targetLanguage: z.string().trim().toLowerCase().optional(),
  })
  .strict()

export type ParsedTranslationPayload = {
  segmentId: string
  targetLanguage: SupportedTranslationLanguage
}

export type TranslationRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

export function parseTranslationPayload(
  body: unknown
): TranslationRouteDecision<ParsedTranslationPayload> {
  const result = translationPayloadSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Translation payload is invalid.',
      },
    }

  const targetLanguage =
    result.data.targetLanguage ?? DEFAULT_TRANSLATION_LANGUAGE

  if (!isSupportedTranslationLanguage(targetLanguage))
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Target language is not supported yet.',
      },
    }

  return {
    ok: true,
    data: {
      segmentId: result.data.segmentId,
      targetLanguage,
    },
  }
}

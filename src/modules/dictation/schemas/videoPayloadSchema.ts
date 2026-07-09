import { z } from 'zod'

import { isValidTranslationLanguage } from '@/modules/dictation/translations/languages'

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : undefined
}

const trimmedOptionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).max(240).optional()
)

export const createDictationVideoPayloadSchema = z
  .object({
    title: trimmedOptionalString,
    youtubeUrl: z
      .string()
      .trim()
      .url('Enter a valid video URL.')
      .max(2048, 'Video URL is too long.'),
    transcriptStatus: z
      .enum(['none', 'manualNeeded', 'manualAdded'])
      .optional()
      .default('manualNeeded'),
  })
  .strict()

export type CreateDictationVideoPayload = z.infer<
  typeof createDictationVideoPayloadSchema
>

export const updateDictationVideoPayloadSchema = z
  .object({
    defaultLanguage: z
      .string()
      .trim()
      .min(2)
      .max(12)
      .refine(isValidTranslationLanguage, 'Enter a valid language code.'),
  })
  .strict()

export type UpdateDictationVideoPayload = z.infer<
  typeof updateDictationVideoPayloadSchema
>

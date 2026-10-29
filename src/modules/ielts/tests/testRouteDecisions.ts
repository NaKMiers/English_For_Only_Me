import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import {
  IELTS_SECTION_KEYS,
  IELTS_TRACKS,
  type IeltsSectionKey,
} from '../constants'
import { ieltsSectionInputSchema, ieltsTestMetaSchema } from '../schema'

export const createTestSchema = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('manual'),
      title: z.string().trim().min(1).max(160),
      track: z.enum(IELTS_TRACKS),
      targetBand: z.number().min(4).max(9),
    })
    .strict(),
  z
    .object({
      mode: z.literal('generate'),
      title: z.string().trim().max(160),
      track: z.enum(IELTS_TRACKS),
      targetBand: z.number().min(4).max(9),
      /** Optional topic hints, spread over the sections in order. */
      topics: z.array(z.string().trim().min(1).max(120)).max(9),
    })
    .strict(),
])

export type CreateTestInput = z.infer<typeof createTestSchema>

export const saveMetaSchema = z
  .object({
    meta: ieltsTestMetaSchema.strict(),
    metaRevision: z.number().int().min(0),
  })
  .strict()

export const saveSectionSchema = z
  .object({
    section: ieltsSectionInputSchema,
    revision: z.number().int().min(0),
  })
  .strict()

export type SaveSectionInput = z.infer<typeof saveSectionSchema>

export const publishSchema = z
  .object({ confirmWarnings: z.boolean().default(false) })
  .strict()

function parseWith<T>(
  schema: z.ZodType<T>,
  body: unknown,
  fallback: string
): IeltsDecision<T> {
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]

    return ieltsError(
      400,
      issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : fallback
    )
  }

  return { ok: true, data: parsed.data }
}

export const parseCreateTest = (body: unknown) =>
  parseWith(createTestSchema, body, 'Invalid test.')

export const parseSaveMeta = (body: unknown) =>
  parseWith(saveMetaSchema, body, 'Invalid metadata.')

export const parseSaveSection = (body: unknown) =>
  parseWith(saveSectionSchema, body, 'Invalid section.')

export const parsePublish = (body: unknown) =>
  parseWith(publishSchema, body ?? {}, 'Invalid publish request.')

export function parseTestId(value: string): IeltsDecision<string> {
  if (!isValidObjectId(value)) return ieltsError(404, 'Test not found.')

  return { ok: true, data: value }
}

export function parseSectionKey(value: string): IeltsDecision<IeltsSectionKey> {
  if (!(IELTS_SECTION_KEYS as readonly string[]).includes(value))
    return ieltsError(404, 'Section not found.')

  return { ok: true, data: value as IeltsSectionKey }
}

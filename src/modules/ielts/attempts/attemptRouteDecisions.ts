import { isValidObjectId } from 'mongoose'
import { z } from 'zod'

import { format, type MessageValues } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { ielts as enIelts } from '@/i18n/messages/en/ielts'

import {
  IELTS_ANSWER_MAX_LENGTH,
  IELTS_ESSAY_MAX_LENGTH,
  IELTS_PART_COUNTS,
  IELTS_QUESTION_TYPES,
  IELTS_SKILLS,
} from '../constants'

export type IeltsApiErrorStatus =
  400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503

export type IeltsApiMessageKey = keyof Messages['ielts']['apiErrors']

export interface IeltsApiError {
  ok: false
  status: IeltsApiErrorStatus
  /** `message` is English; the route handler sends it in the learner's language. */
  body: { message: string }
  /** Catalogue key of a learner-facing message, with its values. */
  messageKey?: IeltsApiMessageKey
  messageValues?: MessageValues
}

export type IeltsDecision<T> = { ok: true; data: T } | IeltsApiError

export function ieltsError(
  status: IeltsApiErrorStatus,
  message: string
): IeltsApiError {
  return { ok: false, status, body: { message } }
}

/**
 * Fills an API error message from a catalogue. A `type` value is a question
 * type code, named in the catalogue's language.
 */
export function formatIeltsApiMessage(
  catalogue: Messages['ielts'],
  key: IeltsApiMessageKey,
  values: MessageValues = {}
): string {
  const type = values.type
  const named =
    typeof type === 'string' && type in catalogue.questionTypes
      ? {
          ...values,
          type: catalogue.questionTypes[
            type as keyof Messages['ielts']['questionTypes']
          ],
        }
      : values

  return format(catalogue.apiErrors[key], named)
}

/** A learner-facing error: English in the body, localized by the route. */
export function ieltsMessageError(
  status: IeltsApiErrorStatus,
  messageKey: IeltsApiMessageKey,
  messageValues?: MessageValues
): IeltsApiError {
  return {
    ok: false,
    status,
    body: {
      message: formatIeltsApiMessage(enIelts, messageKey, messageValues),
    },
    messageKey,
    messageValues,
  }
}

const idempotencyKey = z.string().trim().min(8).max(120)

const scopeSchema = z.union([
  z.object({ kind: z.literal('skill') }).strict(),
  z
    .object({ kind: z.literal('part'), part: z.number().int().min(1).max(4) })
    .strict(),
])

export const startAttemptSchema = z
  .object({
    testSlug: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]{1,80}$/),
    skill: z.enum(IELTS_SKILLS),
    mode: z.enum(['practice', 'mock']),
    scope: scopeSchema,
    sessionId: z.string().trim().min(8).max(80).nullable().default(null),
    idempotencyKey,
  })
  .strict()

export type StartAttemptInput = z.infer<typeof startAttemptSchema>

export const startDrillSchema = z
  .object({
    skill: z.enum(['listening', 'reading']),
    type: z.enum(IELTS_QUESTION_TYPES),
    idempotencyKey,
  })
  .strict()

export type StartDrillInput = z.infer<typeof startDrillSchema>

const answerValue = z.union([
  z.string().max(IELTS_ESSAY_MAX_LENGTH),
  z.array(z.string().trim().min(1).max(8)).max(3),
])

const answersSchema = z
  .record(z.string().regex(/^\d{1,2}$/), answerValue)
  .refine(answers => Object.keys(answers).length <= 40, {
    message: 'Too many answers.',
  })

export const saveAnswersSchema = z
  .object({
    answers: answersSchema,
    seq: z.number().int().min(1).max(1_000_000),
  })
  .strict()

export const submitAttemptSchema = saveAnswersSchema
  .extend({ idempotencyKey })
  .strict()

/** Practice: grade one part now, from the answers on screen. */
export const checkPartSchema = z
  .object({
    answers: answersSchema,
    part: z.number().int().min(1).max(4),
  })
  .strict()

export type CheckPartInput = z.infer<typeof checkPartSchema>

export const audioEventSchema = z.union([
  z
    .object({
      kind: z.literal('part-started'),
      part: z.number().int().min(1).max(4),
    })
    .strict(),
  z
    .object({
      kind: z.enum(['interrupted', 'resumed']),
      positionSec: z.number().min(0).max(3600),
    })
    .strict(),
])

export type AudioEventInput = z.infer<typeof audioEventSchema>

export const gradeWritingSchema = z
  .object({ task: z.union([z.literal(1), z.literal(2)]) })
  .strict()

/** Practice: AI feedback on one Writing task, from the essay on screen. */
export const checkTaskSchema = z
  .object({
    essay: z.string().max(IELTS_ESSAY_MAX_LENGTH),
    task: z.union([z.literal(1), z.literal(2)]),
  })
  .strict()

/** The check route takes a part (Listening, Reading) or a task (Writing). */
export const checkPracticeSchema = z.union([checkPartSchema, checkTaskSchema])

function parseWith<T>(
  schema: z.ZodType<T>,
  body: unknown,
  fallback: string
): IeltsDecision<T> {
  const parsed = schema.safeParse(body)

  if (!parsed.success)
    return ieltsError(400, parsed.error.issues[0]?.message ?? fallback)

  return { ok: true, data: parsed.data }
}

export function parseStartAttempt(body: unknown) {
  const parsed = parseWith(startAttemptSchema, body, 'Invalid attempt request.')

  if (!parsed.ok) return parsed

  const { scope, skill } = parsed.data

  if (scope.kind === 'part' && scope.part > IELTS_PART_COUNTS[skill])
    return ieltsMessageError(400, 'tooFewParts', {
      count: IELTS_PART_COUNTS[skill],
      skill,
    })

  return parsed
}

export const parseStartDrill = (body: unknown) =>
  parseWith(startDrillSchema, body, 'Invalid drill request.')

export const parseAudioEvent = (body: unknown) =>
  parseWith(audioEventSchema, body, 'Invalid audio event.')

export const parseCheckPractice = (body: unknown) =>
  parseWith(checkPracticeSchema, body, 'Invalid check request.')

export const parseGradeWriting = (body: unknown) =>
  parseWith(gradeWritingSchema, body, 'Invalid grading request.')

/**
 * Answers are capped per value: objective answers at 300 characters, essays
 * (keys "1" and "2" on a writing attempt) at 20k.
 */
export function validateAnswerLengths(
  answers: Record<string, string | string[]>,
  isWriting: boolean
): IeltsDecision<Record<string, string | string[]>> {
  for (const [key, value] of Object.entries(answers)) {
    if (isWriting && key !== '1' && key !== '2')
      return ieltsError(400, 'Writing answers use keys 1 and 2.')

    if (
      !isWriting &&
      typeof value === 'string' &&
      value.length > IELTS_ANSWER_MAX_LENGTH
    )
      return ieltsMessageError(400, 'answerTooLong', { number: key })

    if (isWriting && Array.isArray(value))
      return ieltsError(400, 'Writing answers must be text.')
  }

  return { ok: true, data: answers }
}

export function parseSaveAnswers(body: unknown) {
  return parseWith(saveAnswersSchema, body, 'Invalid answers.')
}

export function parseSubmitAttempt(body: unknown) {
  return parseWith(submitAttemptSchema, body, 'Invalid submit request.')
}

export function parseAttemptId(value: string): IeltsDecision<string> {
  if (!isValidObjectId(value)) return ieltsMessageError(404, 'attemptNotFound')

  return { ok: true, data: value }
}

export function parseEvidenceNumber(
  value: string | null
): IeltsDecision<number> {
  const number = Number(value)

  if (!Number.isInteger(number) || number < 1 || number > 40)
    return ieltsMessageError(400, 'questionNumberRange')

  return { ok: true, data: number }
}

/** A band exists only for a full skill (all 40 questions), outside drills. */
export function shouldAwardBand({
  mode,
  scopeKind,
  total,
}: {
  mode: 'practice' | 'mock' | 'drill'
  scopeKind: 'skill' | 'part'
  total: number
}): boolean {
  return mode !== 'drill' && scopeKind === 'skill' && total === 40
}

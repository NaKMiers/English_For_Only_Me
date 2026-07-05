import { z } from 'zod'

import type {
  DictationAttemptAction,
  DictationAttemptApiRecord,
} from '@/modules/dictation/types'

import type { ApiErrorDecision } from './videoRouteDecisions'

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Expected a MongoDB object id.')

const attemptPayloadSchema = z
  .object({
    action: z.enum(['check', 'reveal', 'skip']),
    idempotencyKey: z.string().trim().min(8).max(120),
    replayCountDelta: z.number().int().min(0).max(500).optional(),
    segmentId: objectIdSchema,
    timeSpentMs: z
      .number()
      .int()
      .min(0)
      .max(1000 * 60 * 60 * 6)
      .optional(),
    typedAnswer: z.string().max(5000).optional(),
  })
  .strict()

export type ParsedAttemptPayload = z.infer<typeof attemptPayloadSchema>

export type AttemptRouteDecision<T> =
  | {
      data: T
      ok: true
    }
  | (ApiErrorDecision & {
      ok: false
    })

export function parseAttemptPayload(
  body: unknown
): AttemptRouteDecision<ParsedAttemptPayload> {
  const result = attemptPayloadSchema.safeParse(body)

  if (!result.success)
    return {
      ok: false,
      status: 400,
      body: {
        message: 'Attempt payload is invalid.',
      },
    }

  return {
    ok: true,
    data: {
      ...result.data,
      replayCountDelta: result.data.replayCountDelta ?? 0,
      timeSpentMs: result.data.timeSpentMs ?? 0,
      typedAnswer: result.data.typedAnswer ?? '',
    },
  }
}

export function getAttemptSegmentStatus(action: DictationAttemptAction) {
  if (action === 'reveal') return 'revealed'
  if (action === 'skip') return 'skipped'

  return null
}

export function getCheckSegmentStatus(isPassed: boolean) {
  return isPassed ? 'correct' : 'attemptedIncorrect'
}

export function shouldAdvanceAttemptCursor({
  action,
  isPassed,
}: {
  action: DictationAttemptAction
  isPassed: boolean
}) {
  return action === 'skip' || (action === 'check' && isPassed)
}

export function resolveAttemptSubmissionMode(
  existingAttempt: DictationAttemptApiRecord | null
) {
  if (existingAttempt)
    return {
      attempt: existingAttempt,
      mode: 'idempotent' as const,
    }

  return {
    attempt: null,
    mode: 'create' as const,
  }
}

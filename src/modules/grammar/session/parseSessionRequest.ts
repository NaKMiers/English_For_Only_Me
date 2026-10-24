import { z } from 'zod'

import { GRAMMAR_SESSION_MODES } from '@/modules/grammar/constants'

import type { GrammarSessionSubmission } from './planGrammarSessionWrite'

/**
 * Shape check for POST /api/grammar/sessions. Everything semantic (do these
 * cards belong to this lesson, is it unlocked) is the planner's job; this only
 * bounds the payload so a hostile body cannot make the server do real work.
 */
const sessionRequestSchema = z.object({
  answers: z
    .array(
      z.object({
        answer: z.unknown(),
        cardId: z.string().min(1).max(60),
      })
    )
    .min(1)
    .max(20),
  idempotencyKey: z.string().min(8).max(100),
  mode: z.enum(GRAMMAR_SESSION_MODES),
  targetId: z.string().min(1).max(40),
})

export type ParsedSessionRequest =
  | {
      ok: true
      idempotencyKey: string
      submission: GrammarSessionSubmission
    }
  | { ok: false; message: string }

export function parseSessionRequest(body: unknown): ParsedSessionRequest {
  const parsed = sessionRequestSchema.safeParse(body)

  if (!parsed.success)
    return { message: 'Dữ liệu bài làm không hợp lệ.', ok: false }

  const { answers, idempotencyKey, mode, targetId } = parsed.data

  return {
    idempotencyKey,
    ok: true,
    submission: {
      answers: answers.map(item => ({
        answer: item.answer,
        cardId: item.cardId,
      })),
      mode,
      targetId,
    },
  }
}

import { z } from 'zod'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import { IELTS_TEST_VOCAB_MAX } from '../constants'

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i

export const saveTestVocabSchema = z
  .object({
    entryIds: z
      .array(z.string().regex(OBJECT_ID_REGEX, 'Invalid word id.'))
      .max(IELTS_TEST_VOCAB_MAX),
  })
  .strict()

export type SaveTestVocabInput = z.infer<typeof saveTestVocabSchema>

export function parseSaveTestVocab(
  body: unknown
): IeltsDecision<SaveTestVocabInput> {
  const parsed = saveTestVocabSchema.safeParse(body)

  if (!parsed.success) {
    const issue = parsed.error.issues[0]

    return ieltsError(
      400,
      issue
        ? `${issue.path.join('.') || 'body'}: ${issue.message}`
        : 'Invalid word list.'
    )
  }

  return { ok: true, data: parsed.data }
}

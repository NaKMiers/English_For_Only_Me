import { z } from 'zod'

const band = z.number().min(0).max(9)

/**
 * Strict examiner output. Every field required (nullable instead of
 * optional) so it converts to an OpenAI strict schema; the limits here are
 * enforced on parse.
 */
export const examinerOutputSchema = z.object({
  criteria: z.object({
    taskResponse: band,
    coherenceCohesion: band,
    lexicalResource: band,
    grammar: band,
  }),
  summary: z.string().min(1).max(1200),
  corrections: z
    .array(
      z.object({
        quote: z.string().min(1).max(300),
        suggestion: z.string().min(1).max(300),
        reason: z.string().min(1).max(400),
        grammarLessonId: z.string().max(80).nullable(),
      })
    )
    .max(12),
  improved: z.string().max(2500),
})

export type ExaminerOutput = z.infer<typeof examinerOutputSchema>

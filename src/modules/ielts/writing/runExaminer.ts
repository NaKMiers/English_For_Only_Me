import { requestQwenStructuredOutput } from '@/lib/ai/qwenClientCore'
import { toStrictJsonSchema } from '@/lib/ai/strictJsonSchema'

import type {
  IeltsGradingErrorCode,
  IeltsWritingTaskFeedback,
} from '../attempts/attemptRecords'
import { roundTaskBand } from '../scoring/roundBand'
import {
  buildExaminerMessages,
  EXAMINER_PROMPT_VERSION,
  type ExaminerInput,
} from './examinerPrompt'
import { examinerOutputSchema } from './examinerSchema'

const EXAMINER_SCHEMA = toStrictJsonSchema(examinerOutputSchema)
export const EXAMINER_MAX_OUTPUT_TOKENS = 6000
export const AI_REQUEST_TIMEOUT_MS = 240_000

/** Adds the per-request abort signal so no call outlives the route limit. */
export function withTimeout(
  fetcher: typeof fetch,
  timeoutMs = AI_REQUEST_TIMEOUT_MS
): typeof fetch {
  return (input, init) =>
    fetcher(input, { ...init, signal: AbortSignal.timeout(timeoutMs) })
}

export type ExaminerResult =
  | { ok: true; feedback: IeltsWritingTaskFeedback; usage: unknown }
  /** `code` is what the learner sees (catalogue text); `message` is logged. */
  | {
      ok: false
      code: Extract<IeltsGradingErrorCode, 'invalidOutput' | 'providerFailed'>
      message: string
    }

/**
 * One examiner request: build the prompt, call Qwen, parse with the Zod
 * schema, keep only quotes that occur in the essay and lesson ids that
 * exist, and compute the task band (mean of the four criteria, floored to a
 * half band).
 */
export async function runExaminer({
  apiKey,
  fetcher = fetch,
  input,
  model,
}: {
  apiKey: string | null
  fetcher?: typeof fetch
  input: ExaminerInput
  model: string
}): Promise<ExaminerResult> {
  const response = await requestQwenStructuredOutput({
    apiKey,
    fetcher: withTimeout(fetcher),
    input: buildExaminerMessages(input),
    maxOutputTokens: EXAMINER_MAX_OUTPUT_TOKENS,
    model,
    reasoningEffort: 'low',
    schema: EXAMINER_SCHEMA,
    schemaName: 'ielts_writing_feedback',
  })

  if (!response.ok)
    return { ok: false, code: 'providerFailed', message: response.message }

  let json: unknown

  try {
    json = JSON.parse(response.text)
  } catch {
    return {
      ok: false,
      code: 'invalidOutput',
      message: 'The examiner returned invalid JSON.',
    }
  }

  const parsed = examinerOutputSchema.safeParse(json)

  if (!parsed.success)
    return {
      ok: false,
      code: 'invalidOutput',
      message: `The examiner output did not match the schema: ${parsed.error.issues[0]?.message ?? 'unknown'}`,
    }

  const lessons = new Map(input.lessons.map(lesson => [lesson.id, lesson]))
  const { criteria } = parsed.data
  const taskBand = roundTaskBand([
    criteria.taskResponse,
    criteria.coherenceCohesion,
    criteria.lexicalResource,
    criteria.grammar,
  ])

  return {
    ok: true,
    usage: response.usage,
    feedback: {
      status: 'done',
      error: '',
      language: input.language,
      model,
      promptVersion: EXAMINER_PROMPT_VERSION,
      criteria: {
        taskResponse: criteria.taskResponse,
        cc: criteria.coherenceCohesion,
        lr: criteria.lexicalResource,
        gra: criteria.grammar,
      },
      band: taskBand,
      summary: parsed.data.summary,
      corrections: parsed.data.corrections
        .filter(item => input.essay.includes(item.quote))
        .map(item => {
          const lesson = item.grammarLessonId
            ? lessons.get(item.grammarLessonId)
            : undefined

          return {
            quote: item.quote,
            suggestion: item.suggestion,
            reason: item.reason,
            grammarLessonId: lesson?.id ?? null,
            grammarLessonTitle: lesson?.title ?? null,
          }
        }),
      improved: parsed.data.improved,
    },
  }
}

import { z } from 'zod'

import { toOpenAiStrictSchema } from '@/lib/ai/openAiStrictSchema'

import {
  ieltsChartVisualSchema,
  ieltsListeningLineSchema,
  ieltsQuestionGroupSchema,
  ieltsReadingMaterialSchema,
} from '../schema'

/*
 * Strict AI output schemas, one per job kind. Every field is required
 * (nullable instead of optional) so they convert to OpenAI strict mode; the
 * same Zod schema parses the response, so the dropped limits still apply.
 */

export const readingSectionOutput = z.object({
  title: z.string(),
  reading: ieltsReadingMaterialSchema,
  groups: z.array(ieltsQuestionGroupSchema).min(1).max(6),
})

export const listeningScriptOutput = z.object({
  title: z.string(),
  context: z.string(),
  lines: z.array(ieltsListeningLineSchema).min(12).max(80),
})

export const listeningQuestionsOutput = z.object({
  groups: z.array(ieltsQuestionGroupSchema).min(1).max(6),
})

export const writingTaskOutput = z.object({
  title: z.string(),
  prompt: z.string().min(20),
  visual: ieltsChartVisualSchema.nullable(),
  sampleAnswer: z.string().min(100),
})

export const assistOutput = z.object({
  summary: z.string(),
  notes: z.array(z.string()).max(20),
  groups: z.array(ieltsQuestionGroupSchema).max(6).nullable(),
})

export const IELTS_JOB_SCHEMAS = {
  'reading-section': readingSectionOutput,
  'listening-script': listeningScriptOutput,
  'listening-questions': listeningQuestionsOutput,
  'writing-task': writingTaskOutput,
  assist: assistOutput,
} as const

export type IeltsJobKind = keyof typeof IELTS_JOB_SCHEMAS

export const IELTS_JOB_MAX_TOKENS: Record<IeltsJobKind, number> = {
  'reading-section': 16_000,
  'listening-script': 8_000,
  'listening-questions': 8_000,
  'writing-task': 6_000,
  assist: 8_000,
}

let strictCache: Partial<Record<IeltsJobKind, Record<string, unknown>>> = {}

export function strictSchemaFor(kind: IeltsJobKind) {
  strictCache[kind] ??= toOpenAiStrictSchema(IELTS_JOB_SCHEMAS[kind])

  return strictCache[kind]
}

/** Tests only. */
export function resetStrictSchemaCache() {
  strictCache = {}
}

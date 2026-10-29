import { z } from 'zod'

import {
  IELTS_GEN_STATUSES,
  IELTS_QUESTION_TYPES,
  IELTS_SECTION_KEYS,
  IELTS_SKILLS,
  IELTS_TEST_SOURCES,
  IELTS_TEST_STATUSES,
  IELTS_TRACKS,
} from './constants'

/*
 * Domain schema for IELTS test content. This file is the authority: the
 * Mongoose model mirrors it, the editor validates against it and every AI
 * output is mapped into it before the consistency check runs.
 *
 *   IeltsTest
 *     └─ sections[]   (key listening-1..4 | reading-1..3 | writing-1..2)
 *          ├─ listening | reading | writing material
 *          └─ groups[] (one instruction + Markdown body with {{qN}} slots)
 *               └─ questions[] (answers, evidence, explanation)
 */

const text = (max: number) => z.string().trim().max(max)

export const ieltsEvidenceSchema = z.object({
  quote: text(600).min(1),
  blockIndex: z.number().int().min(0).max(200),
})

export const ieltsQuestionSchema = z.object({
  number: z.number().int().min(1).max(40),
  prompt: text(600),
  answers: z.array(text(120).min(1)).max(8),
  evidence: ieltsEvidenceSchema.nullable(),
  explanation: text(1200),
})

export const ieltsOptionSchema = z.object({
  key: text(8).min(1),
  text: text(400).min(1),
})

export const ieltsWordLimitSchema = z.object({
  maxWords: z.number().int().min(1).max(5),
  allowNumber: z.boolean(),
})

export const ieltsQuestionGroupSchema = z.object({
  id: text(40).min(1),
  type: z.enum(IELTS_QUESTION_TYPES),
  from: z.number().int().min(1).max(40),
  to: z.number().int().min(1).max(40),
  instruction: text(600),
  wordLimit: ieltsWordLimitSchema.nullable(),
  title: text(200),
  body: text(6000),
  options: z.array(ieltsOptionSchema).max(12),
  correctKeys: z.array(text(8).min(1)).max(5),
  imageUrl: text(500),
  questions: z.array(ieltsQuestionSchema).max(20),
})

export const ieltsListeningLineSchema = z.object({
  speaker: text(60).min(1),
  voice: text(20).min(1),
  text: text(1200).min(1),
})

export const ieltsAudioSchema = z.object({
  url: text(600).min(1),
  publicId: text(300),
  durationSec: z.number().min(0).max(1800),
  lineOffsetsSec: z.array(z.number().min(0)).max(200),
})

export const ieltsListeningMaterialSchema = z.object({
  context: text(600),
  lines: z.array(ieltsListeningLineSchema).max(120),
  audio: ieltsAudioSchema.nullable(),
})

export const ieltsReadingMaterialSchema = z.object({
  title: text(200),
  subtitle: text(400),
  paragraphs: z
    .array(z.object({ label: text(4), text: text(4000).min(1) }))
    .max(20),
})

export const ieltsChartVisualSchema = z.object({
  kind: z.enum(['line', 'bar', 'pie', 'table']),
  title: text(200),
  xLabel: text(80),
  yLabel: text(80),
  unit: text(40),
  categories: z.array(text(60)).max(24),
  series: z
    .array(
      z.object({
        name: text(60),
        values: z.array(z.number().finite()).max(24),
      })
    )
    .max(8),
})

export const ieltsImageVisualSchema = z.object({
  kind: z.literal('image'),
  imageUrl: text(600).min(1),
  alt: text(400),
})

export const ieltsVisualSchema = z.union([
  ieltsChartVisualSchema,
  ieltsImageVisualSchema,
])

export const ieltsWritingMaterialSchema = z.object({
  task: z.union([z.literal(1), z.literal(2)]),
  prompt: text(2000),
  minWords: z.number().int().min(50).max(400),
  visual: ieltsVisualSchema.nullable(),
  sampleAnswer: text(6000),
})

export const ieltsSectionSchema = z.object({
  key: z.enum(IELTS_SECTION_KEYS),
  skill: z.enum(IELTS_SKILLS),
  order: z.number().int().min(1).max(4),
  title: text(200),
  revision: z.number().int().min(0),
  genStatus: z.enum(IELTS_GEN_STATUSES),
  genStartedAt: z.date().nullable(),
  genError: text(1000),
  listening: ieltsListeningMaterialSchema.nullable(),
  reading: ieltsReadingMaterialSchema.nullable(),
  writing: ieltsWritingMaterialSchema.nullable(),
  groups: z.array(ieltsQuestionGroupSchema).max(10),
})

export const ieltsTestMetaSchema = z.object({
  title: text(160).min(1),
  /** Catalogue group ("IELTS 21"); empty groups by the title instead. */
  series: text(80),
  track: z.enum(IELTS_TRACKS),
  targetBand: z.number().min(4).max(9),
  tags: z.array(text(40).min(1)).max(10),
  description: text(600),
})

export const ieltsTestSchema = ieltsTestMetaSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  version: z.number().int().min(1),
  status: z.enum(IELTS_TEST_STATUSES),
  source: z.enum(IELTS_TEST_SOURCES),
  sections: z.array(ieltsSectionSchema).max(9),
})

/** Section content as the editor sends it (server owns the status fields). */
export const ieltsSectionInputSchema = ieltsSectionSchema
  .omit({
    key: true,
    skill: true,
    order: true,
    revision: true,
    genStatus: true,
    genStartedAt: true,
    genError: true,
  })
  .strict()

export type IeltsEvidence = z.infer<typeof ieltsEvidenceSchema>
export type IeltsQuestion = z.infer<typeof ieltsQuestionSchema>
export type IeltsOption = z.infer<typeof ieltsOptionSchema>
export type IeltsWordLimit = z.infer<typeof ieltsWordLimitSchema>
export type IeltsQuestionGroup = z.infer<typeof ieltsQuestionGroupSchema>
export type IeltsListeningLine = z.infer<typeof ieltsListeningLineSchema>
export type IeltsAudio = z.infer<typeof ieltsAudioSchema>
export type IeltsListeningMaterial = z.infer<
  typeof ieltsListeningMaterialSchema
>
export type IeltsReadingMaterial = z.infer<typeof ieltsReadingMaterialSchema>
export type IeltsChartVisual = z.infer<typeof ieltsChartVisualSchema>
export type IeltsVisual = z.infer<typeof ieltsVisualSchema>
export type IeltsWritingMaterial = z.infer<typeof ieltsWritingMaterialSchema>
export type IeltsSection = z.infer<typeof ieltsSectionSchema>
export type IeltsSectionInput = z.infer<typeof ieltsSectionInputSchema>
export type IeltsTestMeta = z.infer<typeof ieltsTestMetaSchema>
export type IeltsTestContent = z.infer<typeof ieltsTestSchema>

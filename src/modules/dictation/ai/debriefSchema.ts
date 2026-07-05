import { z } from 'zod'

export const DICTATION_DEBRIEF_SCHEMA_NAME = 'dictation_ielts_debrief'

export const dictationDebriefOutputSchema = z
  .object({
    caveats: z.array(z.string().trim().min(1)).min(1).max(4),
    confidence: z.number().min(0).max(1),
    contentSummary: z.string().trim().min(1).max(700),
    keyVocabulary: z
      .array(
        z
          .object({
            example: z.string().trim().min(1).max(240),
            meaning: z.string().trim().min(1).max(240),
            term: z.string().trim().min(1).max(80),
          })
          .strict()
      )
      .max(8),
    listeningTraps: z.array(z.string().trim().min(1).max(220)).max(6),
    nextActions: z.array(z.string().trim().min(1).max(220)).min(1).max(3),
    weakPatterns: z.array(z.string().trim().min(1).max(220)).max(6),
  })
  .strict()

export type DictationDebriefOutput = z.infer<
  typeof dictationDebriefOutputSchema
>

export const dictationDebriefJsonSchema = {
  additionalProperties: false,
  properties: {
    caveats: {
      items: {
        type: 'string',
      },
      maxItems: 4,
      minItems: 1,
      type: 'array',
    },
    confidence: {
      maximum: 1,
      minimum: 0,
      type: 'number',
    },
    contentSummary: {
      type: 'string',
    },
    keyVocabulary: {
      items: {
        additionalProperties: false,
        properties: {
          example: {
            type: 'string',
          },
          meaning: {
            type: 'string',
          },
          term: {
            type: 'string',
          },
        },
        required: ['term', 'meaning', 'example'],
        type: 'object',
      },
      maxItems: 8,
      type: 'array',
    },
    listeningTraps: {
      items: {
        type: 'string',
      },
      maxItems: 6,
      type: 'array',
    },
    nextActions: {
      items: {
        type: 'string',
      },
      maxItems: 3,
      minItems: 1,
      type: 'array',
    },
    weakPatterns: {
      items: {
        type: 'string',
      },
      maxItems: 6,
      type: 'array',
    },
  },
  required: [
    'contentSummary',
    'keyVocabulary',
    'listeningTraps',
    'weakPatterns',
    'nextActions',
    'confidence',
    'caveats',
  ],
  type: 'object',
} as const

export function parseDictationDebriefOutput(
  value: unknown
): DictationDebriefOutput {
  return dictationDebriefOutputSchema.parse(value)
}

export function parseDictationDebriefJson(text: string) {
  return parseDictationDebriefOutput(JSON.parse(text))
}

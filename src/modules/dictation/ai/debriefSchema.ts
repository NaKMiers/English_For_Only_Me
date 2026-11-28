import { z } from 'zod'

export const DICTATION_DEBRIEF_SCHEMA_NAME = 'dictation_ielts_debrief'

/**
 * Size limits shared by the Zod schema, the prompt and the clamp. The JSON
 * schema sent to the provider carries no `maxLength`, so the model only
 * learns the character limits from the prompt.
 */
export const DICTATION_DEBRIEF_LIMITS = {
  caveats: 4,
  contentSummary: 700,
  keyVocabulary: 8,
  /** One `listeningTraps`, `nextActions` or `weakPatterns` item. */
  listItem: 220,
  listeningTraps: 6,
  nextActions: 3,
  term: 80,
  /** A vocabulary `meaning` or `example`. */
  termGloss: 240,
  weakPatterns: 6,
} as const

const LIMITS = DICTATION_DEBRIEF_LIMITS

export const dictationDebriefOutputSchema = z
  .object({
    caveats: z.array(z.string().trim().min(1)).min(1).max(LIMITS.caveats),
    confidence: z.number().min(0).max(1),
    contentSummary: z.string().trim().min(1).max(LIMITS.contentSummary),
    keyVocabulary: z
      .array(
        z
          .object({
            example: z.string().trim().min(1).max(LIMITS.termGloss),
            meaning: z.string().trim().min(1).max(LIMITS.termGloss),
            term: z.string().trim().min(1).max(LIMITS.term),
          })
          .strict()
      )
      .max(LIMITS.keyVocabulary),
    listeningTraps: z
      .array(z.string().trim().min(1).max(LIMITS.listItem))
      .max(LIMITS.listeningTraps),
    nextActions: z
      .array(z.string().trim().min(1).max(LIMITS.listItem))
      .min(1)
      .max(LIMITS.nextActions),
    weakPatterns: z
      .array(z.string().trim().min(1).max(LIMITS.listItem))
      .max(LIMITS.weakPatterns),
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
      maxItems: LIMITS.caveats,
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
      maxItems: LIMITS.keyVocabulary,
      type: 'array',
    },
    listeningTraps: {
      items: {
        type: 'string',
      },
      maxItems: LIMITS.listeningTraps,
      type: 'array',
    },
    nextActions: {
      items: {
        type: 'string',
      },
      maxItems: LIMITS.nextActions,
      minItems: 1,
      type: 'array',
    },
    weakPatterns: {
      items: {
        type: 'string',
      },
      maxItems: LIMITS.weakPatterns,
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

/** Cuts at a word boundary when one is near the end, then marks the cut. */
function clampText(value: unknown, max: number) {
  if (typeof value !== 'string') return value

  const text = value.trim()

  if (text.length <= max) return text

  const cut = text.slice(0, max - 3)
  const space = cut.lastIndexOf(' ')

  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}...`
}

function clampList(
  value: unknown,
  maxItems: number,
  clampItem: (item: unknown) => unknown
) {
  return Array.isArray(value) ? value.slice(0, maxItems).map(clampItem) : value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Trims over-long strings and lists to the schema limits. The model is told
 * the limits but does not always keep them, and one long item must not throw
 * away a whole (billed) debrief. Anything else still fails the Zod parse.
 */
export function clampDictationDebriefOutput(value: unknown): unknown {
  if (!isRecord(value)) return value

  const listItem = (item: unknown) => clampText(item, LIMITS.listItem)

  return {
    ...value,
    caveats: clampList(value.caveats, LIMITS.caveats, item => item),
    contentSummary: clampText(value.contentSummary, LIMITS.contentSummary),
    keyVocabulary: clampList(
      value.keyVocabulary,
      LIMITS.keyVocabulary,
      entry =>
        isRecord(entry)
          ? {
              ...entry,
              example: clampText(entry.example, LIMITS.termGloss),
              meaning: clampText(entry.meaning, LIMITS.termGloss),
              term: clampText(entry.term, LIMITS.term),
            }
          : entry
    ),
    listeningTraps: clampList(
      value.listeningTraps,
      LIMITS.listeningTraps,
      listItem
    ),
    nextActions: clampList(value.nextActions, LIMITS.nextActions, listItem),
    weakPatterns: clampList(value.weakPatterns, LIMITS.weakPatterns, listItem),
  }
}

export function parseDictationDebriefOutput(
  value: unknown
): DictationDebriefOutput {
  return dictationDebriefOutputSchema.parse(clampDictationDebriefOutput(value))
}

export function parseDictationDebriefJson(text: string) {
  return parseDictationDebriefOutput(JSON.parse(text))
}

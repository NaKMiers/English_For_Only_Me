import 'server-only'

import { getQwenApiKey } from '@/constants/environments'
import type { Locale } from '@/i18n/config'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
import { LANGUAGE_NAMES } from '@/lib/ai/languageNames'

import {
  ieltsError,
  type IeltsDecision,
} from '../attempts/attemptRouteDecisions'
import { type IeltsSectionKey } from '../constants'
import type { IeltsSectionInput } from '../schema'
import { emptySection } from '../tests/emptySections'
import {
  assistOutput,
  IELTS_JOB_MAX_TOKENS,
  strictSchemaFor,
} from './aiSchemas'
import { qwenRequester } from './generationService'
import { numberRange } from './prompts'
import {
  checkJobOutput,
  type IeltsRequester,
  normalizeGroups,
} from './runSectionJob'

export const IELTS_ASSIST_ACTIONS = [
  'draft-questions',
  'paraphrase-distractors',
  'suggest-evidence',
  'check-answers',
] as const
export type IeltsAssistAction = (typeof IELTS_ASSIST_ACTIONS)[number]

const ACTION_BRIEFS: Record<IeltsAssistAction, string> = {
  'draft-questions':
    'Keep the material as it is. Write the full set of question groups for it (replace any existing groups), with answers, verbatim evidence and explanations.',
  'paraphrase-distractors':
    'Keep the material, the question numbers and every correct answer. Rewrite question prompts and options so they paraphrase the material instead of echoing it, and add plausible distractors. Return all groups.',
  'suggest-evidence':
    'Keep everything. For every question whose evidence or explanation is missing or wrong, fill it in: evidence quotes copied word for word from the referenced block. Return all groups.',
  'check-answers':
    'Answer every question yourself from the material only. In `notes`, list each question whose stored answer looks wrong or ambiguous, with the reason. Return `groups` as null.',
}

export interface IeltsAssistProposal {
  summary: string
  section: IeltsSectionInput | null
  notes: string[]
}

function materialText(section: IeltsSectionInput) {
  if (section.reading)
    return [
      `Title: ${section.reading.title}`,
      ...section.reading.paragraphs.map(
        (paragraph, index) =>
          `[${index}]${paragraph.label ? ` ${paragraph.label}.` : ''} ${paragraph.text}`
      ),
    ].join('\n')

  return (section.listening?.lines ?? [])
    .map((line, index) => `[${index}] ${line.speaker}: ${line.text}`)
    .join('\n')
}

/**
 * AI-assisted editing for one listening or reading section: returns a
 * proposal; nothing is saved. The proposal is checked with the same rules
 * as generation and the problems are listed as notes.
 */
export async function assistSection({
  action,
  copy = en.ieltsEditor.generation,
  instruction,
  key,
  language = 'en',
  request = qwenRequester(),
  section,
}: {
  action: IeltsAssistAction
  /** Messages the admin sees, in their language (English by default). */
  copy?: Messages['ieltsEditor']['generation']
  instruction: string
  key: IeltsSectionKey
  /** The admin's app language: `summary` and `notes` are written in it. */
  language?: Locale
  request?: IeltsRequester
  section: IeltsSectionInput
}): Promise<IeltsDecision<IeltsAssistProposal>> {
  if (key.startsWith('writing')) return ieltsError(400, copy.assistSkills)

  if (!getQwenApiKey()) return ieltsError(503, copy.noApiKey)

  if (!materialText(section).trim()) return ieltsError(400, copy.materialFirst)

  const { from, to } = numberRange(key)
  const response = await request({
    messages: [
      {
        role: 'system',
        content: [
          'You help an admin edit an IELTS-style practice section on a private site. All material is original; keep it original and never copy published tests.',
          ACTION_BRIEFS[action],
          `Questions in this section are numbered ${from}-${to}. Evidence blockIndex is the [index] shown in the material. Bodies use only simple Markdown with {{qN}} slots, never HTML.`,
          `\`summary\`: one or two sentences in ${LANGUAGE_NAMES[language]} on what you changed or found. \`notes\`: short bullet points in ${LANGUAGE_NAMES[language]}. The section material itself stays in English.`,
        ].join('\n\n'),
      },
      {
        role: 'user',
        content: [
          instruction ? `Admin request: ${instruction}` : '',
          'Material:',
          materialText(section),
          'Current question groups (JSON):',
          JSON.stringify(section.groups),
        ]
          .filter(Boolean)
          .join('\n\n'),
      },
    ],
    schema: strictSchemaFor('assist'),
    schemaName: 'ielts_assist',
    maxOutputTokens: IELTS_JOB_MAX_TOKENS.assist,
  })

  if (!response.ok) return ieltsError(500, response.message)

  let json: unknown

  try {
    json = JSON.parse(response.text)
  } catch {
    return ieltsError(500, copy.invalidJson)
  }

  const parsed = assistOutput.safeParse(json)

  if (!parsed.success) return ieltsError(500, copy.badShape)

  if (!parsed.data.groups || action === 'check-answers')
    return {
      ok: true,
      data: {
        summary: parsed.data.summary,
        section: null,
        notes: parsed.data.notes,
      },
    }

  const next: IeltsSectionInput = {
    ...section,
    groups: normalizeGroups(key, parsed.data.groups),
  }
  const { issues } = checkJobOutput(
    'listening-questions',
    { ...emptySection(key), ...next },
    next
  )

  return {
    ok: true,
    data: {
      summary: parsed.data.summary,
      section: next,
      notes: [
        ...parsed.data.notes,
        ...issues.slice(0, 10).map(issue => format(copy.checkNote, { issue })),
      ],
    },
  }
}

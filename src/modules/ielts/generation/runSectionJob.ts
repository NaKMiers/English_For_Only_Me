import type { OpenAiUsage } from '@/lib/ai/openAiClientCore'

import { checkSection } from '../consistency/checkTest'
import type { IeltsSectionKey } from '../constants'
import type {
  IeltsQuestionGroup,
  IeltsSection,
  IeltsSectionInput,
} from '../schema'
import {
  IELTS_JOB_MAX_TOKENS,
  IELTS_JOB_SCHEMAS,
  type IeltsJobKind,
  listeningQuestionsOutput,
  listeningScriptOutput,
  readingSectionOutput,
  strictSchemaFor,
  writingTaskOutput,
} from './aiSchemas'
import { type IeltsMessage, numberRange, repairMessages } from './prompts'

/*
 * One AI step for one section, with all I/O injected:
 *
 *   messages -> request -> JSON parse -> Zod parse -> map to section input
 *            -> consistency check -> ok | needsRepair (keep raw + issues) | failed
 *
 * A route call performs exactly one step (one OpenAI request), so a step
 * always fits inside the route's time limit.
 */

export type IeltsRequester = (input: {
  messages: IeltsMessage[]
  schema: Record<string, unknown>
  schemaName: string
  maxOutputTokens: number
}) => Promise<
  | { ok: true; text: string; usage: OpenAiUsage | null }
  | { ok: false; message: string }
>

export interface IeltsJobResult {
  outcome: 'ok' | 'needsRepair' | 'failed'
  input: IeltsSectionInput | null
  rawText: string
  issues: string[]
  failedRules: string[]
  usage: OpenAiUsage | null
  error: string
}

/** Stable, section-scoped ids and from/to taken from the questions. */
export function normalizeGroups(
  key: IeltsSectionKey,
  groups: IeltsQuestionGroup[]
): IeltsQuestionGroup[] {
  return groups.map((group, index) => {
    const numbers = group.questions.map(question => question.number)

    return {
      ...group,
      id: `${key}-g${index + 1}`,
      from: numbers.length ? Math.min(...numbers) : group.from,
      to: numbers.length ? Math.max(...numbers) : group.to,
      imageUrl: group.imageUrl ?? '',
      correctKeys:
        group.type === 'multiple-choice-multi' ? group.correctKeys : [],
      options:
        group.type === 'true-false-not-given' ||
        group.type === 'yes-no-not-given'
          ? []
          : group.options,
    }
  })
}

/** Map a parsed AI output onto the section's editable content. */
export function mapJobOutput(
  kind: IeltsJobKind,
  section: IeltsSection,
  parsed: unknown
): IeltsSectionInput {
  const base: IeltsSectionInput = {
    title: section.title,
    listening: section.listening,
    reading: section.reading,
    writing: section.writing,
    groups: section.groups,
  }

  if (kind === 'reading-section') {
    const output = readingSectionOutput.parse(parsed)

    return {
      ...base,
      title: output.title || section.title,
      reading: output.reading,
      groups: normalizeGroups(section.key, output.groups),
    }
  }

  if (kind === 'listening-script') {
    const output = listeningScriptOutput.parse(parsed)

    // A new script invalidates old questions and audio.
    return {
      ...base,
      title: output.title || section.title,
      listening: { context: output.context, lines: output.lines, audio: null },
      groups: [],
    }
  }

  if (kind === 'listening-questions') {
    const output = listeningQuestionsOutput.parse(parsed)

    return { ...base, groups: normalizeGroups(section.key, output.groups) }
  }

  const output = writingTaskOutput.parse(parsed)
  const task = section.writing?.task ?? 1

  return {
    ...base,
    title: output.title || section.title,
    writing: {
      task,
      prompt: output.prompt,
      minWords: task === 1 ? 150 : 250,
      visual: task === 1 ? output.visual : null,
      sampleAnswer: output.sampleAnswer,
    },
    groups: [],
  }
}

/** Consistency issues that matter for this step, plus the number range. */
export function checkJobOutput(
  kind: IeltsJobKind,
  section: IeltsSection,
  input: IeltsSectionInput
): { issues: string[]; rules: string[] } {
  const candidate: IeltsSection = { ...section, ...input }
  const report = checkSection(candidate)
  const relevant =
    kind === 'listening-script'
      ? report.errors.filter(
          issue =>
            issue.rule === 'listening_lines' || issue.rule === 'html_in_body'
        )
      : report.errors
  const issues = relevant.map(
    issue => `${issue.rule} at ${issue.path}: ${issue.message}`
  )
  const rules = relevant.map(issue => issue.rule)

  if (kind === 'reading-section' || kind === 'listening-questions') {
    const { from, to } = numberRange(section.key)
    const numbers = input.groups
      .flatMap(group => group.questions.map(question => question.number))
      .sort((left, right) => left - right)
    const expected = Array.from(
      { length: to - from + 1 },
      (_, index) => from + index
    )

    if (numbers.join(',') !== expected.join(',')) {
      issues.push(
        `numbering: questions must be exactly ${from}-${to} once each (got ${numbers.join(',') || 'none'}).`
      )
      rules.push('numbering_contiguous')
    }
  }

  return { issues, rules }
}

export async function runSectionJob({
  kind,
  messages,
  request,
  section,
  repair = null,
}: {
  kind: IeltsJobKind
  messages: IeltsMessage[]
  request: IeltsRequester
  section: IeltsSection
  /** The failed output and its issues, for a repair step. */
  repair?: { rawText: string; issues: string[] } | null
}): Promise<IeltsJobResult> {
  const response = await request({
    messages: repair
      ? repairMessages(messages, repair.rawText, repair.issues)
      : messages,
    schema: strictSchemaFor(kind),
    schemaName: `ielts_${kind.replace(/-/g, '_')}`,
    maxOutputTokens: Math.round(
      IELTS_JOB_MAX_TOKENS[kind] * (repair ? 1.25 : 1)
    ),
  })

  if (!response.ok)
    return {
      outcome: 'failed',
      input: null,
      rawText: '',
      issues: [],
      failedRules: [],
      usage: null,
      error: response.message,
    }

  const fail = (
    issues: string[],
    rules: string[],
    input: IeltsSectionInput | null
  ) => ({
    outcome: repair ? ('failed' as const) : ('needsRepair' as const),
    input,
    rawText: response.text,
    issues,
    failedRules: rules,
    usage: response.usage,
    error: repair ? issues.slice(0, 3).join(' | ') : '',
  })

  let json: unknown

  try {
    json = JSON.parse(response.text)
  } catch {
    return fail(['The output was not valid JSON.'], ['json'], null)
  }

  const parsed = IELTS_JOB_SCHEMAS[kind].safeParse(json)

  if (!parsed.success)
    return fail(
      parsed.error.issues
        .slice(0, 10)
        .map(issue => `schema at ${issue.path.join('.')}: ${issue.message}`),
      ['schema'],
      null
    )

  const input = mapJobOutput(kind, section, parsed.data)
  const { issues, rules } = checkJobOutput(kind, section, input)

  if (issues.length) return fail(issues, rules, input)

  return {
    outcome: 'ok',
    input,
    rawText: response.text,
    issues: [],
    failedRules: [],
    usage: response.usage,
    error: '',
  }
}

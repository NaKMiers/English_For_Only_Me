import {
  IELTS_QUESTION_WIDGETS,
  type IeltsSkill,
  type IeltsTrack,
} from './constants'
import type {
  IeltsAudio,
  IeltsListeningLine,
  IeltsOption,
  IeltsQuestionGroup,
  IeltsReadingMaterial,
  IeltsSection,
  IeltsTestContent,
  IeltsVisual,
  IeltsWordLimit,
} from './schema'
import { normalizeIeltsKey } from './scoring/normalize'

/*
 * What a learner's browser may receive before an attempt is submitted. Built
 * by copying allowed fields (never by deleting forbidden ones), so a new
 * field added to the schema stays server-side until someone adds it here.
 *
 * Forbidden before submit: answers, correctKeys, evidence, explanation,
 * and in mock or drill also the listening transcript (it contains the
 * answers). The writing sample answer comes only when asked for: the
 * runner shows it in practice and mock, closed until the learner opens it.
 */

export interface IeltsPublicQuestion {
  number: number
  prompt: string
}

export interface IeltsPublicGroup {
  id: string
  type: IeltsQuestionGroup['type']
  from: number
  to: number
  instruction: string
  wordLimit: IeltsWordLimit | null
  title: string
  body: string
  options: IeltsOption[]
  /**
   * A completion group answered with option letters ("Choose the correct
   * letter, A-I"): each blank is a letter dropdown, not free text. Says only
   * that the answers are letters, which the instruction already tells.
   */
  pickLetter: boolean
  imageUrl: string
  questions: IeltsPublicQuestion[]
}

export interface IeltsPublicSection {
  key: IeltsSection['key']
  skill: IeltsSkill
  order: number
  title: string
  listening: {
    context: string
    lines: IeltsListeningLine[] | null
    audio: Pick<IeltsAudio, 'url' | 'durationSec'> | null
  } | null
  reading: IeltsReadingMaterial | null
  writing: {
    task: 1 | 2
    prompt: string
    minWords: number
    visual: IeltsVisual | null
    /** The model answer, opened on request (runner only, never in drill). */
    sampleAnswer?: string
  } | null
  groups: IeltsPublicGroup[]
}

export interface IeltsPublicTest {
  slug: string
  version: number
  title: string
  track: IeltsTrack
  targetBand: number
  description: string
  sections: IeltsPublicSection[]
}

const OPTION_LINE = /^\s*[-*]\s+\*\*([A-Z])\*\*\s+(.+)$/gm

/** The "- **A** ending" lines a summary body lists its word box with. */
export function optionsInBody(body: string): IeltsOption[] {
  return [...body.matchAll(OPTION_LINE)].map(([, key, text]) => ({
    key,
    text: text.trim(),
  }))
}

const TABLE_RULE = /^\s*\|?[\s:|-]+\|?\s*$/
const flat = (value: string) =>
  value.replace(/[*_|]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * True when a body line only lists word box entries, in any of the ways the
 * content stores them: "- **A** fast", "A. fast", "A) fast", "**A** fast
 * **B** isolated", or a table row "| A fast | B isolated |".
 */
function isOptionLine(line: string, options: IeltsOption[]): boolean {
  let rest = ` ${flat(line).replace(/^[-+] /, '')} `
  let found = false

  for (const option of options) {
    const key = option.key.toLowerCase()
    const text = flat(option.text)
    const before = rest

    for (const entry of [
      `${key} ${text}`,
      `${key}. ${text}`,
      `${key}) ${text}`,
      `${key}: ${text}`,
    ])
      rest = rest.replace(` ${entry} `, ' ')

    if (rest !== before) found = true
  }

  return found && !rest.replace(/[-,;\s]/g, '')
}

/**
 * The body without its word box, for showing the box on its own above the
 * summary as on the paper. A table left with only its header rule goes too.
 */
export function bodyWithoutOptions(
  body: string,
  options: IeltsOption[] = optionsInBody(body)
): string {
  const lines = body.split('\n').filter(line => !isOptionLine(line, options))
  const hasTableRow = lines.some(
    line => line.includes('|') && !TABLE_RULE.test(line)
  )

  return lines
    .filter(
      line => hasTableRow || !TABLE_RULE.test(line) || !line.includes('|')
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function toPublicGroup(group: IeltsQuestionGroup): IeltsPublicGroup {
  const options = group.options.length
    ? group.options
    : optionsInBody(group.body)
  const keys = new Set(options.map(option => normalizeIeltsKey(option.key)))
  const pickLetter =
    IELTS_QUESTION_WIDGETS[group.type] === 'slot' &&
    keys.size > 0 &&
    group.questions.every(question =>
      question.answers.some(answer => keys.has(normalizeIeltsKey(answer)))
    )

  return {
    id: group.id,
    type: group.type,
    from: group.from,
    to: group.to,
    instruction: group.instruction,
    wordLimit: group.wordLimit
      ? {
          maxWords: group.wordLimit.maxWords,
          allowNumber: group.wordLimit.allowNumber,
        }
      : null,
    title: group.title,
    body: group.body,
    options: options.map(option => ({
      key: option.key,
      text: option.text,
    })),
    pickLetter,
    imageUrl: group.imageUrl,
    questions: group.questions.map(question => ({
      number: question.number,
      prompt: question.prompt,
    })),
  }
}

export function toPublicSection(
  section: IeltsSection,
  {
    includeSampleAnswer = false,
    includeTranscript,
  }: { includeSampleAnswer?: boolean; includeTranscript: boolean }
): IeltsPublicSection {
  return {
    key: section.key,
    skill: section.skill,
    order: section.order,
    title: section.title,
    listening: section.listening
      ? {
          context: section.listening.context,
          lines: includeTranscript
            ? section.listening.lines.map(line => ({
                speaker: line.speaker,
                voice: line.voice,
                text: line.text,
              }))
            : null,
          audio: section.listening.audio
            ? {
                url: section.listening.audio.url,
                durationSec: section.listening.audio.durationSec,
              }
            : null,
        }
      : null,
    reading: section.reading
      ? {
          title: section.reading.title,
          subtitle: section.reading.subtitle,
          paragraphs: section.reading.paragraphs.map(paragraph => ({
            label: paragraph.label,
            text: paragraph.text,
          })),
        }
      : null,
    writing: section.writing
      ? {
          task: section.writing.task,
          prompt: section.writing.prompt,
          minWords: section.writing.minWords,
          visual: section.writing.visual,
          ...(includeSampleAnswer && section.writing.sampleAnswer.trim()
            ? { sampleAnswer: section.writing.sampleAnswer }
            : {}),
        }
      : null,
    groups: section.groups.map(toPublicGroup),
  }
}

export function toPublicTest(
  test: IeltsTestContent,
  options: { includeTranscript: boolean }
): IeltsPublicTest {
  return {
    slug: test.slug,
    version: test.version,
    title: test.title,
    track: test.track,
    targetBand: test.targetBand,
    description: test.description,
    sections: [...test.sections]
      .sort((left, right) =>
        left.skill === right.skill
          ? left.order - right.order
          : left.skill.localeCompare(right.skill)
      )
      .map(section => toPublicSection(section, options)),
  }
}

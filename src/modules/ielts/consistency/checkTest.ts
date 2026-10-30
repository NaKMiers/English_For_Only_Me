import {
  IELTS_OBJECTIVE_TOTAL,
  IELTS_QUESTION_WIDGETS,
  LISTENING_VOICE_IDS,
  NOT_GIVEN,
  TFNG_OPTIONS,
  YNNG_OPTIONS,
  type IeltsSkill,
} from '../constants'
import { collectSlotsFromSource, containsHtml } from '../markdown/parse'
import type {
  IeltsQuestion,
  IeltsQuestionGroup,
  IeltsSection,
  IeltsTestContent,
} from '../schema'
import { normalizeIeltsKey } from '../scoring/normalize'
import { isWithinWordLimit } from '../scoring/wordCount'

/*
 * Deterministic checks run on every AI result, on every editor save preview
 * and as the publish gate. Rule ids are stable: they appear in generation
 * logs, repair prompts and the publish panel.
 */

export type IeltsConsistencyRule =
  | 'numbering_contiguous'
  | 'group_range_matches'
  | 'slot_has_question'
  | 'question_has_slot'
  | 'answers_present'
  | 'answer_within_limit'
  | 'letter_answers_valid'
  | 'evidence_found'
  | 'explanation_present'
  | 'html_in_body'
  | 'passage_length'
  | 'listening_lines'
  | 'audio_offsets'
  | 'audio_duration'
  | 'writing_task'
  | 'sections_complete'

export interface IeltsConsistencyIssue {
  rule: IeltsConsistencyRule
  sectionKey: string
  path: string
  message: string
}

export interface IeltsConsistencyReport {
  errors: IeltsConsistencyIssue[]
  warnings: IeltsConsistencyIssue[]
}

type Report = (
  rule: IeltsConsistencyRule,
  path: string,
  message: string
) => void

const ROMAN_NUMERALS = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
]

function collapse(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function blockTexts(section: IeltsSection): string[] {
  if (section.reading)
    return section.reading.paragraphs.map(paragraph => paragraph.text)

  if (section.listening) return section.listening.lines.map(line => line.text)

  return []
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function validLetterKeys(group: IeltsQuestionGroup): string[] {
  if (group.type === 'true-false-not-given') return [...TFNG_OPTIONS]
  if (group.type === 'yes-no-not-given') return [...YNNG_OPTIONS]

  return group.options.map(option => normalizeIeltsKey(option.key))
}

function isNotGiven(question: IeltsQuestion) {
  return question.answers.some(
    answer => normalizeIeltsKey(answer) === NOT_GIVEN
  )
}

function checkGroup(
  section: IeltsSection,
  group: IeltsQuestionGroup,
  groupIndex: number,
  report: Report
) {
  const at = `groups[${groupIndex}]`
  const numbers = group.questions.map(question => question.number)
  const expected = Array.from(
    { length: Math.max(0, group.to - group.from + 1) },
    (_, index) => group.from + index
  )
  const widget = IELTS_QUESTION_WIDGETS[group.type]

  if (
    group.from > group.to ||
    numbers.length !== expected.length ||
    numbers.some((number, index) => number !== expected[index])
  )
    report(
      'group_range_matches',
      at,
      `Questions ${group.from}-${group.to} must be numbered ${group.from} to ${group.to} in order.`
    )

  for (const [field, value] of [
    ['instruction', group.instruction],
    ['title', group.title],
    ['body', group.body],
    ...group.options.map((option, index) => [`options[${index}]`, option.text]),
  ] as const)
    if (containsHtml(value))
      report('html_in_body', `${at}.${field}`, 'HTML is not allowed.')

  if (widget === 'slot') {
    const slots = collectSlotsFromSource(group.body)

    for (const slot of slots)
      if (!numbers.includes(slot))
        report(
          'slot_has_question',
          `${at}.body`,
          `Slot {{q${slot}}} has no question in this group.`
        )

    for (const question of group.questions) {
      const count = slots.filter(slot => slot === question.number).length
      const hasPrompt = question.prompt.includes(`{{q${question.number}}}`)

      if (count + (hasPrompt ? 1 : 0) !== 1)
        report(
          'question_has_slot',
          `${at}.questions[${question.number}]`,
          `Question ${question.number} needs exactly one {{q${question.number}}} slot.`
        )
    }
  }

  if (group.type === 'multiple-choice-multi') {
    if (group.correctKeys.length !== group.questions.length)
      report(
        'answers_present',
        `${at}.correctKeys`,
        `Choose-${group.questions.length} group needs ${group.questions.length} correct letters.`
      )

    const valid = validLetterKeys(group)

    for (const key of group.correctKeys)
      if (!valid.includes(normalizeIeltsKey(key)))
        report(
          'letter_answers_valid',
          `${at}.correctKeys`,
          `"${key}" is not one of the options.`
        )
  }

  const blocks = blockTexts(section).map(collapse)

  for (const question of group.questions) {
    const path = `${at}.questions[${question.number}]`

    if (containsHtml(question.prompt) || containsHtml(question.explanation))
      report('html_in_body', path, 'HTML is not allowed.')

    if (!question.explanation.trim())
      report(
        'explanation_present',
        path,
        `Question ${question.number} needs an explanation.`
      )

    if (group.type === 'multiple-choice-multi') continue

    if (question.answers.length === 0) {
      report(
        'answers_present',
        path,
        `Question ${question.number} has no accepted answer.`
      )
      continue
    }

    if (widget === 'slot')
      for (const answer of question.answers)
        if (!isWithinWordLimit(answer, group.wordLimit))
          report(
            'answer_within_limit',
            path,
            `"${answer}" breaks the word limit of question ${question.number}.`
          )

    if (widget !== 'slot') {
      const valid =
        group.type === 'matching-headings' && group.options.length === 0
          ? ROMAN_NUMERALS
          : validLetterKeys(group)

      for (const answer of question.answers)
        if (!valid.includes(normalizeIeltsKey(answer)))
          report(
            'letter_answers_valid',
            path,
            `"${answer}" is not a valid choice for question ${question.number}.`
          )
    }

    if (isNotGiven(question)) continue

    if (!question.evidence) {
      report(
        'evidence_found',
        path,
        `Question ${question.number} needs an evidence quote.`
      )
      continue
    }

    const block = blocks[question.evidence.blockIndex]

    if (!block || !block.includes(collapse(question.evidence.quote)))
      report(
        'evidence_found',
        path,
        `The evidence quote of question ${question.number} is not in block ${question.evidence.blockIndex}.`
      )
  }
}

function checkMaterial(section: IeltsSection, report: Report, warn: Report) {
  if (section.skill === 'reading') {
    if (!section.reading || section.reading.paragraphs.length === 0) {
      report('passage_length', 'reading', 'The passage is empty.')
      return
    }

    for (const [index, paragraph] of section.reading.paragraphs.entries())
      if (containsHtml(paragraph.text))
        report(
          'html_in_body',
          `reading.paragraphs[${index}]`,
          'HTML is not allowed.'
        )

    const words = section.reading.paragraphs.reduce(
      (sum, paragraph) => sum + countWords(paragraph.text),
      0
    )

    if (words < 600 || words > 1100)
      report(
        'passage_length',
        'reading',
        `The passage has ${words} words; it needs 600-1100.`
      )
    else if (words < 700 || words > 1000)
      warn(
        'passage_length',
        'reading',
        `The passage has ${words} words; 700-1000 is typical.`
      )
  }

  if (section.skill === 'listening') {
    const listening = section.listening

    if (!listening || listening.lines.length < 12) {
      report(
        'listening_lines',
        'listening',
        'A listening part needs at least 12 script lines.'
      )
      return
    }

    for (const [index, line] of listening.lines.entries()) {
      if (!LISTENING_VOICE_IDS.includes(line.voice as never))
        report(
          'listening_lines',
          `listening.lines[${index}]`,
          `Unknown voice "${line.voice}".`
        )

      if (containsHtml(line.text))
        report(
          'html_in_body',
          `listening.lines[${index}]`,
          'HTML is not allowed.'
        )
    }

    const audio = listening.audio

    if (audio) {
      if (audio.durationSec <= 0)
        report('audio_duration', 'listening.audio', 'Audio has no duration.')

      // A manually uploaded mp3 has no offsets; only check offsets when present.
      const offsets = audio.lineOffsetsSec

      if (
        offsets.length > 0 &&
        (offsets.length !== listening.lines.length ||
          offsets.some(
            (offset, index) =>
              offset >= audio.durationSec ||
              (index > 0 && offset <= offsets[index - 1])
          ))
      )
        report(
          'audio_offsets',
          'listening.audio',
          'Audio line offsets do not match the script.'
        )
    }
  }

  if (section.skill === 'writing') {
    const writing = section.writing

    if (!writing || !writing.prompt.trim()) {
      report('writing_task', 'writing', 'The writing prompt is empty.')
      return
    }

    if (containsHtml(writing.prompt) || containsHtml(writing.sampleAnswer))
      report('html_in_body', 'writing', 'HTML is not allowed.')

    if (writing.task === 1 && !writing.visual)
      report('writing_task', 'writing.visual', 'Task 1 needs a visual.')

    const minimum = writing.task === 1 ? 150 : 250

    if (writing.minWords !== minimum)
      report(
        'writing_task',
        'writing.minWords',
        `Task ${writing.task} needs ${minimum} words minimum.`
      )
  }
}

export function checkSection(section: IeltsSection): IeltsConsistencyReport {
  const errors: IeltsConsistencyIssue[] = []
  const warnings: IeltsConsistencyIssue[] = []
  const report: Report = (rule, path, message) =>
    errors.push({ rule, sectionKey: section.key, path, message })
  const warn: Report = (rule, path, message) =>
    warnings.push({ rule, sectionKey: section.key, path, message })

  checkMaterial(section, report, warn)
  section.groups.forEach((group, index) =>
    checkGroup(section, group, index, report)
  )

  return { errors, warnings }
}

/**
 * Ready for learners: written (by AI or by hand), free of blocking errors and,
 * for listening, with its audio. `manual` only says who wrote a section, so a
 * blank manual draft is not ready.
 */
export function isSectionReady(section: IeltsSection) {
  if (section.genStatus !== 'ready' && section.genStatus !== 'manual')
    return false

  if (section.skill === 'listening' && !section.listening?.audio) return false

  return checkSection(section).errors.length === 0
}

const OBJECTIVE_SKILLS: Exclude<IeltsSkill, 'writing'>[] = [
  'listening',
  'reading',
]

export function checkTest(test: IeltsTestContent): IeltsConsistencyReport {
  const errors: IeltsConsistencyIssue[] = []
  const warnings: IeltsConsistencyIssue[] = []

  for (const section of test.sections) {
    const result = checkSection(section)

    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  for (const skill of OBJECTIVE_SKILLS) {
    const sections = test.sections
      .filter(section => section.skill === skill)
      .sort((left, right) => left.order - right.order)

    if (sections.length === 0) continue

    const numbers = sections.flatMap(section =>
      section.groups.flatMap(group =>
        group.questions.map(question => question.number)
      )
    )
    const contiguous = numbers.every((number, index) => number === index + 1)

    if (!contiguous || numbers.length !== IELTS_OBJECTIVE_TOTAL)
      errors.push({
        rule: 'numbering_contiguous',
        sectionKey: skill,
        path: skill,
        message: `${skill} must number its questions 1 to 40 in order (found ${numbers.length}).`,
      })
  }

  if (test.sections.length === 0)
    errors.push({
      rule: 'sections_complete',
      sectionKey: 'test',
      path: 'sections',
      message: 'The test has no sections.',
    })

  return { errors, warnings }
}

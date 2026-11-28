import { format } from '@/i18n/format'

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
  | 'visual_missing'
  | 'question_stem_missing'

/**
 * English text of every issue. It goes into repair prompts and logs, so it
 * stays English; the editor shows `ieltsEditor.issues[code]` (same keys and
 * placeholders) in the admin's language.
 */
const ISSUE_MESSAGES = {
  rangeOrder: 'Questions {from}-{to} must be numbered {from} to {to} in order.',
  html: 'HTML is not allowed.',
  slotNoQuestion: 'Slot {{q{slot}}} has no question in this group.',
  questionSlot: 'Question {number} needs exactly one {{q{number}}} slot.',
  multiCount: 'Choose-{count} group needs {count} correct letters.',
  keyNotOption: '"{key}" is not one of the options.',
  needsExplanation: 'Question {number} needs an explanation.',
  noAnswer: 'Question {number} has no accepted answer.',
  wordLimit: '"{answer}" breaks the word limit of question {number}.',
  invalidChoice: '"{answer}" is not a valid choice for question {number}.',
  needsEvidence: 'Question {number} needs an evidence quote.',
  evidenceNotInBlock:
    'The evidence quote of question {number} is not in block {block}.',
  passageEmpty: 'The passage is empty.',
  passageLength: 'The passage has {words} words; it needs 600-1100.',
  passageTypical: 'The passage has {words} words; 700-1000 is typical.',
  tooFewLines: 'A listening part needs at least 12 script lines.',
  unknownVoice: 'Unknown voice "{voice}".',
  noDuration: 'Audio has no duration.',
  offsetsMismatch: 'Audio line offsets do not match the script.',
  writingEmpty: 'The writing prompt is empty.',
  writingNoStatement:
    'The writing prompt has no task statement, only the time and word-count lines.',
  task1Visual: 'Task 1 needs a visual.',
  minWords: 'Task {task} needs {minimum} words minimum.',
  visualMissing:
    'Questions {from}-{to} refer to a diagram, map or picture but the group has no image.',
  stemMissing: 'Question {number} has options but no question text.',
  numbering:
    '{skill} must number its questions 1 to 40 in order (found {count}).',
  noSections: 'The test has no sections.',
} as const

export type IeltsIssueCode = keyof typeof ISSUE_MESSAGES

export type IeltsIssueValues = Record<string, string | number>

export interface IeltsConsistencyIssue {
  rule: IeltsConsistencyRule
  sectionKey: string
  path: string
  /** English text, for prompts and logs. */
  message: string
  /** Picks the localized text in the editor. */
  code: IeltsIssueCode
  values: IeltsIssueValues
}

export interface IeltsConsistencyReport {
  errors: IeltsConsistencyIssue[]
  warnings: IeltsConsistencyIssue[]
}

type Report = (
  rule: IeltsConsistencyRule,
  path: string,
  code: IeltsIssueCode,
  values?: IeltsIssueValues
) => void

function issueOf(
  rule: IeltsConsistencyRule,
  sectionKey: string,
  path: string,
  code: IeltsIssueCode,
  values: IeltsIssueValues = {}
): IeltsConsistencyIssue {
  return {
    rule,
    sectionKey,
    path,
    message: format(ISSUE_MESSAGES[code], values),
    code,
    values,
  }
}

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
    report('group_range_matches', at, 'rangeOrder', {
      from: group.from,
      to: group.to,
    })

  for (const [field, value] of [
    ['instruction', group.instruction],
    ['title', group.title],
    ['body', group.body],
    ...group.options.map((option, index) => [`options[${index}]`, option.text]),
  ] as const)
    if (containsHtml(value)) report('html_in_body', `${at}.${field}`, 'html')

  if (widget === 'slot') {
    const slots = collectSlotsFromSource(group.body)

    for (const slot of slots)
      if (!numbers.includes(slot))
        report('slot_has_question', `${at}.body`, 'slotNoQuestion', { slot })

    for (const question of group.questions) {
      const count = slots.filter(slot => slot === question.number).length
      const hasPrompt = question.prompt.includes(`{{q${question.number}}}`)

      if (count + (hasPrompt ? 1 : 0) !== 1)
        report(
          'question_has_slot',
          `${at}.questions[${question.number}]`,
          'questionSlot',
          { number: question.number }
        )
    }
  }

  if (group.type === 'multiple-choice-multi') {
    if (group.correctKeys.length !== group.questions.length)
      report('answers_present', `${at}.correctKeys`, 'multiCount', {
        count: group.questions.length,
      })

    const valid = validLetterKeys(group)

    for (const key of group.correctKeys)
      if (!valid.includes(normalizeIeltsKey(key)))
        report('letter_answers_valid', `${at}.correctKeys`, 'keyNotOption', {
          key,
        })
  }

  const blocks = blockTexts(section).map(collapse)

  for (const question of group.questions) {
    const path = `${at}.questions[${question.number}]`

    if (containsHtml(question.prompt) || containsHtml(question.explanation))
      report('html_in_body', path, 'html')

    if (!question.explanation.trim())
      report('explanation_present', path, 'needsExplanation', {
        number: question.number,
      })

    if (group.type === 'multiple-choice-multi') continue

    if (question.answers.length === 0) {
      report('answers_present', path, 'noAnswer', { number: question.number })
      continue
    }

    if (widget === 'slot')
      for (const answer of question.answers)
        if (!isWithinWordLimit(answer, group.wordLimit))
          report('answer_within_limit', path, 'wordLimit', {
            answer,
            number: question.number,
          })

    if (widget !== 'slot') {
      const valid =
        group.type === 'matching-headings' && group.options.length === 0
          ? ROMAN_NUMERALS
          : validLetterKeys(group)

      for (const answer of question.answers)
        if (!valid.includes(normalizeIeltsKey(answer)))
          report('letter_answers_valid', path, 'invalidChoice', {
            answer,
            number: question.number,
          })
    }

    if (isNotGiven(question)) continue

    if (!question.evidence) {
      report('evidence_found', path, 'needsEvidence', {
        number: question.number,
      })
      continue
    }

    const block = blocks[question.evidence.blockIndex]

    if (!block || !block.includes(collapse(question.evidence.quote)))
      report('evidence_found', path, 'evidenceNotInBlock', {
        number: question.number,
        block: question.evidence.blockIndex,
      })
  }
}

function checkMaterial(section: IeltsSection, report: Report, warn: Report) {
  if (section.skill === 'reading') {
    if (!section.reading || section.reading.paragraphs.length === 0) {
      report('passage_length', 'reading', 'passageEmpty')
      return
    }

    for (const [index, paragraph] of section.reading.paragraphs.entries())
      if (containsHtml(paragraph.text))
        report('html_in_body', `reading.paragraphs[${index}]`, 'html')

    const words = section.reading.paragraphs.reduce(
      (sum, paragraph) => sum + countWords(paragraph.text),
      0
    )

    if (words < 600 || words > 1100)
      report('passage_length', 'reading', 'passageLength', { words })
    else if (words < 700 || words > 1000)
      warn('passage_length', 'reading', 'passageTypical', { words })
  }

  if (section.skill === 'listening') {
    const listening = section.listening

    if (!listening || listening.lines.length < 12) {
      report('listening_lines', 'listening', 'tooFewLines')
      return
    }

    for (const [index, line] of listening.lines.entries()) {
      if (!LISTENING_VOICE_IDS.includes(line.voice as never))
        report('listening_lines', `listening.lines[${index}]`, 'unknownVoice', {
          voice: line.voice,
        })

      if (containsHtml(line.text))
        report('html_in_body', `listening.lines[${index}]`, 'html')
    }

    const audio = listening.audio

    if (audio) {
      if (audio.durationSec <= 0)
        report('audio_duration', 'listening.audio', 'noDuration')

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
        report('audio_offsets', 'listening.audio', 'offsetsMismatch')
    }
  }

  if (section.skill === 'writing') {
    const writing = section.writing

    if (!writing || !writing.prompt.trim()) {
      report('writing_task', 'writing', 'writingEmpty')
      return
    }

    if (taskStatementWords(writing.prompt) < MIN_TASK_STATEMENT_WORDS)
      report('writing_task', 'writing.prompt', 'writingNoStatement')

    if (containsHtml(writing.prompt) || containsHtml(writing.sampleAnswer))
      report('html_in_body', 'writing', 'html')

    if (writing.task === 1 && !writing.visual)
      report('writing_task', 'writing.visual', 'task1Visual')

    const minimum = writing.task === 1 ? 150 : 250

    if (writing.minWords !== minimum)
      report('writing_task', 'writing.minWords', 'minWords', {
        task: writing.task,
        minimum,
      })
  }
}

// The fixed lines around a Writing task statement (exam-box `>` marks aside).
const WRITING_FRAME_LINE =
  /^(?:You should spend about \d+ minutes on this task|Write at least \d+ words)\.?$/i

/**
 * Words of a real task statement: every one of the 168 imported prompts has
 * 24 or more, while a generated prompt that kept only the frame lines has 0.
 */
const MIN_TASK_STATEMENT_WORDS = 12

/** Words left in a Writing prompt once the time and word-count lines go. */
export function taskStatementWords(prompt: string) {
  return prompt
    .split('\n')
    .map(line => line.replace(/^>\s?/, '').trim())
    .filter(line => line && !WRITING_FRAME_LINE.test(line))
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length
}

// "Label the diagram below", "Look at the map", "pictures A-D", "bar chart".
// A flow-chart is printed as text boxes, so it needs no image.
const VISUAL_WORDS =
  /\b(?<!flow-)(?:diagrams?|maps?|plans?|pictures?|drawings?|charts?|graphs?)\b/i

/**
 * Warns when an instruction points at a picture the group does not have:
 * the learner cannot answer, and the notes were usually rewritten to stand
 * in for it. A warning, not an error, so a text stand-in can still publish.
 */
function checkVisual(group: IeltsQuestionGroup, index: number, warn: Report) {
  if (group.imageUrl || !VISUAL_WORDS.test(group.instruction)) return

  warn('visual_missing', `groups.${index}.imageUrl`, 'visualMissing', {
    from: group.from,
    to: group.to,
  })
}

/**
 * A choice question needs its stem ("What does the writer say about ...?").
 * Without it the learner sees only options A-D and cannot answer, yet the
 * key still scores, so nothing else notices.
 */
function checkStems(group: IeltsQuestionGroup, index: number, warn: Report) {
  if (
    group.type !== 'multiple-choice' &&
    group.type !== 'multiple-choice-multi'
  )
    return
  // "Which THREE things ...? Choose THREE letters" carries the question.
  if (
    group.title.trim() ||
    group.body.trim() ||
    group.instruction.includes('?')
  )
    return

  group.questions.forEach((question, questionIndex) => {
    if (question.prompt.trim()) return

    warn(
      'question_stem_missing',
      `groups.${index}.questions.${questionIndex}.prompt`,
      'stemMissing',
      { number: question.number }
    )
  })
}

export function checkSection(section: IeltsSection): IeltsConsistencyReport {
  const errors: IeltsConsistencyIssue[] = []
  const warnings: IeltsConsistencyIssue[] = []
  const report: Report = (rule, path, code, values) =>
    errors.push(issueOf(rule, section.key, path, code, values))
  const warn: Report = (rule, path, code, values) =>
    warnings.push(issueOf(rule, section.key, path, code, values))

  checkMaterial(section, report, warn)
  section.groups.forEach((group, index) => {
    checkGroup(section, group, index, report)
    checkVisual(group, index, warn)
    checkStems(group, index, warn)
  })

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
      errors.push(
        issueOf('numbering_contiguous', skill, skill, 'numbering', {
          skill,
          count: numbers.length,
        })
      )
  }

  if (test.sections.length === 0)
    errors.push(issueOf('sections_complete', 'test', 'sections', 'noSections'))

  return { errors, warnings }
}

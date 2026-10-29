import {
  IELTS_QUESTION_TYPES,
  LISTENING_VOICES,
  type IeltsSectionKey,
  type IeltsTrack,
} from '../constants'
import type { IeltsListeningLine } from '../schema'

/*
 * Prompt builders (pure). Wording is our own. Every prompt asks for newly
 * written material: no passage, script or question may be copied or
 * closely adapted from any published test book.
 */

export interface IeltsPromptContext {
  key: IeltsSectionKey
  track: IeltsTrack
  targetBand: number
  topic: string | null
  /** Titles of the other sections, so topics do not repeat. */
  otherTitles: string[]
}

export type IeltsMessage = { role: 'system' | 'user'; content: string }

/** Question numbers a section must use: L 10 per part, R 13/13/14. */
export function numberRange(key: IeltsSectionKey): {
  from: number
  to: number
} {
  const [skill, raw] = key.split('-')
  const order = Number(raw)

  if (skill === 'listening')
    return { from: (order - 1) * 10 + 1, to: order * 10 }

  if (skill === 'reading')
    return order === 1
      ? { from: 1, to: 13 }
      : order === 2
        ? { from: 14, to: 26 }
        : { from: 27, to: 40 }

  return { from: 0, to: 0 }
}

const ORIGINALITY =
  'Write completely original material. Do not copy, quote or closely adapt any passage, recording script, question or answer from Cambridge IELTS books, the Official Guide or any other published test. Invent names, places and figures.'

const FORMAT_RULES = [
  'Question group format:',
  `- type is one of: ${IELTS_QUESTION_TYPES.join(', ')}.`,
  '- Completion types (table, note, summary, sentence, flow-chart, form, short-answer) put the gaps in `body` as {{qN}} (N is the question number), one slot per question, and leave `prompt` empty. `wordLimit` matches the instruction, e.g. ONE WORD AND/OR A NUMBER = {maxWords: 1, allowNumber: true}.',
  '- `body` uses only this Markdown: # headings, "- " bullets (two-space indent for a second level), "1. " lists, GFM tables, **bold**, *italic*. Never HTML.',
  '- multiple-choice: one group per question with its own options A-C or A-D; `answers` is the letter.',
  '- multiple-choice-multi (choose TWO/THREE): one group, options A-E, `correctKeys` lists the right letters (as many as questions), each question has `answers: []`.',
  '- true-false-not-given / yes-no-not-given: no options; answers are TRUE|FALSE|NOT GIVEN or YES|NO|NOT GIVEN. Balance the three.',
  '- matching types and plan-map-labelling: options are the list to choose from (matching-headings uses keys i, ii, iii...), each question `prompt` is the item, `answers` is the key. Give more options than questions.',
  '- Accept spelling or form variants in `answers` (e.g. "6.30", "6:30"). Every accepted answer must respect the word limit.',
  '- `evidence.quote` is copied word for word from the block (paragraph or script line) at `evidence.blockIndex` (0-based) and shows why the answer is right. For NOT GIVEN, evidence is null.',
  '- `explanation`: one or two English sentences on why the answer is right and why the tempting alternative is wrong.',
  '- from/to are the first and last question numbers of the group; `id` is short and unique (g1, g2...); `imageUrl` and unused fields are "" or [] or null.',
].join('\n')

function header(context: IeltsPromptContext) {
  return [
    `Track: IELTS ${context.track === 'general' ? 'General Training' : 'Academic'}. Target difficulty: around band ${context.targetBand}.`,
    context.topic ? `Topic hint: ${context.topic}.` : 'Choose a fresh topic.',
    context.otherTitles.length
      ? `Avoid topics already used in this test: ${context.otherTitles.join('; ')}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export function readingSectionMessages(
  context: IeltsPromptContext
): IeltsMessage[] {
  const { from, to } = numberRange(context.key)
  const order = Number(context.key.split('-')[1])

  return [
    {
      role: 'system',
      content: [
        'You write IELTS-style Reading test sections for a private practice site.',
        ORIGINALITY,
        FORMAT_RULES,
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        header(context),
        `Write Reading Passage ${order}: a passage of 750-950 words in 6-8 paragraphs (label them A, B, C... when a matching-information or matching-headings group needs it, else label ""). Difficulty rises from passage 1 to 3.`,
        `Then write questions ${from}-${to} (exactly ${to - from + 1} questions) in 2-4 groups of different types, numbered in order with no gaps.`,
        'Paraphrase the passage in the questions; do not reuse its exact wording in prompts.',
      ].join('\n\n'),
    },
  ]
}

const PART_BRIEF: Record<number, string> = {
  1: 'Part 1: a conversation between two people in an everyday social or service situation (booking, enquiry, registration). Lots of names, numbers, dates and spelled words.',
  2: 'Part 2: one speaker giving information about a place, event or service to a group.',
  3: 'Part 3: a discussion between two to four people in an education or training context.',
  4: 'Part 4: a lecture or talk on an academic subject by one speaker.',
}

export function listeningScriptMessages(
  context: IeltsPromptContext
): IeltsMessage[] {
  const part = Number(context.key.split('-')[1])

  return [
    {
      role: 'system',
      content: [
        'You write IELTS-style Listening recording scripts for a private practice site. The script is turned into audio with text-to-speech.',
        ORIGINALITY,
        `Each line has a speaker name, a voice and the text. Voices: ${LISTENING_VOICES.map(voice => `${voice.id} (${voice.hint})`).join(', ')}. Give every speaker one voice and keep it; different speakers get different voices.`,
        'Write natural spoken English: hesitations, self-corrections and distractors (a detail mentioned then changed) so that 10 questions can test careful listening. No stage directions, no sound effects.',
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        header(context),
        PART_BRIEF[part] ?? PART_BRIEF[1],
        'Length: 30-60 lines, about 600-800 words in total (about 4-6 minutes of audio). `context` is one sentence the test would print before the part.',
      ].join('\n\n'),
    },
  ]
}

export function listeningQuestionsMessages(
  context: IeltsPromptContext,
  lines: IeltsListeningLine[]
): IeltsMessage[] {
  const { from, to } = numberRange(context.key)

  return [
    {
      role: 'system',
      content: [
        'You write IELTS-style Listening questions for an existing script on a private practice site.',
        ORIGINALITY,
        FORMAT_RULES,
        'For listening, `evidence.blockIndex` is the 0-based index of the script line, and questions follow the order of the recording.',
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: [
        header(context),
        `Write questions ${from}-${to} (exactly 10) in 1-3 groups for this script.`,
        'Script (index: speaker: text):',
        lines
          .map((line, index) => `${index}: ${line.speaker}: ${line.text}`)
          .join('\n'),
      ].join('\n\n'),
    },
  ]
}

export function writingTaskMessages(
  context: IeltsPromptContext
): IeltsMessage[] {
  const task = context.key === 'writing-1' ? 1 : 2
  const general = context.track === 'general'
  const brief =
    task === 1
      ? general
        ? 'General Training Task 1: a letter (formal, semi-formal or informal) with a situation and three bullet points. `visual` is null.'
        : 'Academic Task 1: describe a chart. Put the data in `visual` (kind line, bar, pie or table; 3-6 categories; 2-4 series of believable numbers; title, axis labels and unit). The prompt says what the chart shows and asks to summarise, select and compare.'
      : 'Task 2: an essay question (opinion, discuss both views, advantages and disadvantages, or problem and solution) on a general-interest topic. `visual` is null.'

  return [
    {
      role: 'system',
      content: [
        'You write IELTS-style Writing tasks for a private practice site.',
        ORIGINALITY,
        'The prompt follows the usual layout: "You should spend about N minutes on this task.", the task, then "Write at least N words."',
        `The sample answer is a model response at about band ${context.targetBand}, ${task === 1 ? '170-200' : '270-320'} words, paragraphs separated by a blank line.`,
      ].join('\n\n'),
    },
    { role: 'user', content: [header(context), brief].join('\n\n') },
  ]
}

/** A repair turn: the earlier output and what failed, asking for a fix. */
export function repairMessages(
  base: IeltsMessage[],
  rawOutput: string,
  issues: string[]
): IeltsMessage[] {
  return [
    ...base,
    {
      role: 'user',
      content: [
        'Your previous output (below) failed these checks:',
        issues
          .slice(0, 20)
          .map(issue => `- ${issue}`)
          .join('\n'),
        'Return the full corrected JSON. Keep everything that was fine. Evidence quotes must be copied exactly from the referenced block.',
        'Previous output:',
        rawOutput.slice(0, 60_000),
      ].join('\n\n'),
    },
  ]
}

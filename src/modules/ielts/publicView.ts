import type { IeltsSkill, IeltsTrack } from './constants'
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

/*
 * What a learner's browser may receive before an attempt is submitted. Built
 * by copying allowed fields (never by deleting forbidden ones), so a new
 * field added to the schema stays server-side until someone adds it here.
 *
 * Forbidden before submit: answers, correctKeys, evidence, explanation,
 * sampleAnswer, and in mock or drill also the listening transcript (it
 * contains the answers).
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

function toPublicGroup(group: IeltsQuestionGroup): IeltsPublicGroup {
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
    options: group.options.map(option => ({
      key: option.key,
      text: option.text,
    })),
    imageUrl: group.imageUrl,
    questions: group.questions.map(question => ({
      number: question.number,
      prompt: question.prompt,
    })),
  }
}

export function toPublicSection(
  section: IeltsSection,
  { includeTranscript }: { includeTranscript: boolean }
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

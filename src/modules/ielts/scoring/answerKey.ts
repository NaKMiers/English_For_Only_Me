import {
  IELTS_QUESTION_WIDGETS,
  type IeltsQuestionType,
  type IeltsSkill,
} from '../constants'
import type { IeltsSection, IeltsWordLimit } from '../schema'

export interface IeltsKeyedQuestion {
  number: number
  part: number
  type: IeltsQuestionType
  accepted: string[]
  /** Completion answers are text; everything else is a letter-style key. */
  isText: boolean
  wordLimit: IeltsWordLimit | null
}

export interface IeltsKeyedGroup {
  part: number
  type: IeltsQuestionType
  numbers: number[]
  correctKeys: string[]
}

/**
 * Everything scoring needs, extracted once from the sections in scope. It is
 * also what an attempt snapshots at submit time, so a later edit to the test
 * never changes an old result.
 */
export interface IeltsAnswerKey {
  questions: IeltsKeyedQuestion[]
  groups: IeltsKeyedGroup[]
}

export function sectionsInScope(
  sections: IeltsSection[],
  skill: IeltsSkill,
  part: number | null
): IeltsSection[] {
  return sections
    .filter(
      section =>
        section.skill === skill && (part === null || section.order === part)
    )
    .sort((left, right) => left.order - right.order)
}

export function buildAnswerKey(sections: IeltsSection[]): IeltsAnswerKey {
  const questions: IeltsKeyedQuestion[] = []
  const groups: IeltsKeyedGroup[] = []

  for (const section of sections)
    for (const group of section.groups) {
      if (group.type === 'multiple-choice-multi') {
        groups.push({
          part: section.order,
          type: group.type,
          numbers: group.questions
            .map(question => question.number)
            .sort((left, right) => left - right),
          correctKeys: group.correctKeys,
        })
        continue
      }

      for (const question of group.questions)
        questions.push({
          number: question.number,
          part: section.order,
          type: group.type,
          accepted: question.answers,
          isText: IELTS_QUESTION_WIDGETS[group.type] === 'slot',
          wordLimit: group.wordLimit,
        })
    }

  questions.sort((left, right) => left.number - right.number)

  return { questions, groups }
}

export function answerKeyTotal(key: IeltsAnswerKey): number {
  return (
    key.questions.length +
    key.groups.reduce((sum, group) => sum + group.numbers.length, 0)
  )
}

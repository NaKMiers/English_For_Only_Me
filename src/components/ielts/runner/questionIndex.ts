import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

export interface IeltsQuestionEntry {
  number: number
  /** Part (section order) the question belongs to. */
  part: number
  sectionKey: string
  /** For a choose-TWO group, its first number (where the set is stored). */
  setStart: number | null
}

/** Every question number in scope, in order, with its part. */
export function buildQuestionIndex(
  sections: IeltsPublicSection[]
): IeltsQuestionEntry[] {
  return sections
    .flatMap(section =>
      section.groups.flatMap(group =>
        group.questions.map(question => ({
          number: question.number,
          part: section.order,
          sectionKey: section.key,
          setStart: group.type === 'multiple-choice-multi' ? group.from : null,
        }))
      )
    )
    .sort((left, right) => left.number - right.number)
}

export function isAnswered(entry: IeltsQuestionEntry, answers: IeltsAnswers) {
  if (entry.setStart !== null) {
    const raw = answers[String(entry.setStart)]
    const chosen = Array.isArray(raw) ? raw.length : raw ? 1 : 0

    return chosen > entry.number - entry.setStart
  }

  const value = answers[String(entry.number)]

  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
}

export function countBlanks(
  index: IeltsQuestionEntry[],
  answers: IeltsAnswers
) {
  return index.filter(entry => !isAnswered(entry, answers)).length
}

import type { IeltsQuestionType } from '../constants'
import type { IeltsAnswerKey } from './answerKey'
import { answerKeyTotal } from './answerKey'
import { normalizeIeltsAnswer, normalizeIeltsKey } from './normalize'
import { isWithinWordLimit } from './wordCount'

export type IeltsAnswers = Record<string, string | string[]>

export type IeltsAnswerOutcome = 'correct' | 'wrong' | 'blank'

export interface IeltsQuestionResult {
  number: number
  part: number
  type: IeltsQuestionType
  given: string
  accepted: string[]
  outcome: IeltsAnswerOutcome
  points: number
  /** Set when a completion answer was right but too long for the limit. */
  overLimit: boolean
}

export interface IeltsObjectiveResult {
  raw: number
  total: number
  perQuestion: IeltsQuestionResult[]
  perPart: { part: number; raw: number; total: number }[]
}

function asText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(', ')

  return value ?? ''
}

function asKeys(value: string | string[] | undefined): string[] {
  const list = Array.isArray(value) ? value : value ? value.split(',') : []

  return [...new Set(list.map(normalizeIeltsKey).filter(Boolean))]
}

/**
 * Scores Listening or Reading answers against a key.
 *
 * - Completion questions: normalised text match against any accepted
 *   variant, and the answer must respect the word limit.
 * - Letter questions (MC, TFNG, matching): uppercase key match.
 * - Choose TWO / THREE groups: the learner's letter set is matched as a set;
 *   each right letter earns one point, spread over the group's numbers in
 *   order. Order never matters and duplicate letters count once.
 */
export function scoreObjective(
  key: IeltsAnswerKey,
  answers: IeltsAnswers
): IeltsObjectiveResult {
  const perQuestion: IeltsQuestionResult[] = []

  for (const question of key.questions) {
    const given = asText(answers[String(question.number)]).trim()

    if (!given) {
      perQuestion.push({
        number: question.number,
        part: question.part,
        type: question.type,
        given: '',
        accepted: question.accepted,
        outcome: 'blank',
        points: 0,
        overLimit: false,
      })
      continue
    }

    const matches = question.isText
      ? question.accepted.some(
          accepted =>
            normalizeIeltsAnswer(accepted) === normalizeIeltsAnswer(given)
        )
      : question.accepted.some(
          accepted => normalizeIeltsKey(accepted) === normalizeIeltsKey(given)
        )
    const overLimit =
      question.isText && !isWithinWordLimit(given, question.wordLimit)
    const correct = matches && !overLimit

    perQuestion.push({
      number: question.number,
      part: question.part,
      type: question.type,
      given,
      accepted: question.accepted,
      outcome: correct ? 'correct' : 'wrong',
      points: correct ? 1 : 0,
      overLimit: matches && overLimit,
    })
  }

  for (const group of key.groups) {
    const correctKeys = group.correctKeys.map(normalizeIeltsKey)
    // A group's choices are stored under its first number.
    const chosen = asKeys(answers[String(group.numbers[0])]).slice(
      0,
      group.numbers.length
    )
    const hits = chosen.filter(letter => correctKeys.includes(letter))
    const misses = chosen.filter(letter => !correctKeys.includes(letter))

    group.numbers.forEach((number, index) => {
      const hit = hits[index]
      const given = hit ?? misses[index - hits.length] ?? ''

      perQuestion.push({
        number,
        part: group.part,
        type: group.type,
        given,
        accepted: group.correctKeys,
        outcome: hit ? 'correct' : given ? 'wrong' : 'blank',
        points: hit ? 1 : 0,
        overLimit: false,
      })
    })
  }

  perQuestion.sort((left, right) => left.number - right.number)

  const parts = [...new Set(perQuestion.map(row => row.part))].sort(
    (left, right) => left - right
  )

  return {
    raw: perQuestion.reduce((sum, row) => sum + row.points, 0),
    total: answerKeyTotal(key),
    perQuestion,
    perPart: parts.map(part => {
      const rows = perQuestion.filter(row => row.part === part)

      return {
        part,
        raw: rows.reduce((sum, row) => sum + row.points, 0),
        total: rows.length,
      }
    }),
  }
}

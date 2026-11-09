import type { IeltsQuestionType } from './constants'

export interface IeltsJudgementInstruction {
  /** "Do the following statements agree with ... Reading Passage 1?" */
  lead: string
  /** The answer words with their meaning, as the paper prints them. */
  legend: { key: string; meaning: string }[]
}

/**
 * TRUE/FALSE/NOT GIVEN and YES/NO/NOT GIVEN instructions are stored as one
 * prose sentence ("... Choose TRUE if the statement agrees ..."). The paper
 * prints the question, then a small table of the answer words, which is far
 * easier to scan. This keeps the stored question and replaces the prose
 * definitions with the standard legend. Returns null when the text does not
 * start with a question, so the caller shows it unchanged.
 */
export function toJudgementInstruction(
  type: IeltsQuestionType,
  instruction: string
): IeltsJudgementInstruction | null {
  if (type !== 'true-false-not-given' && type !== 'yes-no-not-given')
    return null

  const end = instruction.indexOf('?')

  if (end < 0) return null

  const lead = instruction.slice(0, end + 1).trim()

  if (type === 'true-false-not-given')
    return {
      lead,
      legend: [
        { key: 'TRUE', meaning: 'if the statement agrees with the information' },
        {
          key: 'FALSE',
          meaning: 'if the statement contradicts the information',
        },
        { key: 'NOT GIVEN', meaning: 'if there is no information on this' },
      ],
    }

  const subject = /\bviews\b/i.test(lead) ? 'views' : 'claims'

  return {
    lead,
    legend: [
      {
        key: 'YES',
        meaning: `if the statement agrees with the ${subject} of the writer`,
      },
      {
        key: 'NO',
        meaning: `if the statement contradicts the ${subject} of the writer`,
      },
      {
        key: 'NOT GIVEN',
        meaning: 'if it is impossible to say what the writer thinks about this',
      },
    ],
  }
}

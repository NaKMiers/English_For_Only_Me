import { describe, expect, it } from 'vitest'

import { toJudgementInstruction } from './judgementInstruction'

describe('toJudgementInstruction', () => {
  it('splits a TFNG sentence into the question and the legend', () => {
    const result = toJudgementInstruction(
      'true-false-not-given',
      'Do the following statements agree with the information given in Reading Passage 1? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, or NOT GIVEN if there is no information on this.'
    )

    expect(result?.lead).toBe(
      'Do the following statements agree with the information given in Reading Passage 1?'
    )
    expect(result?.legend.map(row => row.key)).toEqual([
      'TRUE',
      'FALSE',
      'NOT GIVEN',
    ])
  })

  it('handles the short "Write YES, NO or NOT GIVEN" form', () => {
    const result = toJudgementInstruction(
      'yes-no-not-given',
      'Do the following statements agree with the claims of the writer? Write YES, NO or NOT GIVEN.'
    )

    expect(result?.lead).toBe(
      'Do the following statements agree with the claims of the writer?'
    )
    expect(result?.legend[0]).toEqual({
      key: 'YES',
      meaning: 'if the statement agrees with the claims of the writer',
    })
  })

  it('keeps "views" when the question asks about the views of the writer', () => {
    const result = toJudgementInstruction(
      'yes-no-not-given',
      'Do the following statements agree with the views of the writer? Write YES, NO or NOT GIVEN.'
    )

    expect(result?.legend[1].meaning).toBe(
      'if the statement contradicts the views of the writer'
    )
  })

  it('returns null for other types or text without a question', () => {
    expect(
      toJudgementInstruction('multiple-choice', 'Which is true?')
    ).toBeNull()
    expect(
      toJudgementInstruction('true-false-not-given', 'Write TRUE or FALSE.')
    ).toBeNull()
  })
})

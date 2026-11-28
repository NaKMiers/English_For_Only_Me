import type { IeltsAnswerOutcome } from '../scoring/scoreObjective'

/**
 * The accepted answer a review row's "Save word" button would save: a missed
 * answer of one to three plain words, else null. Shared by the result page
 * data (which loads the saved state) and the review list.
 */
export function reviewWordOf(row: {
  accepted: string[]
  outcome: IeltsAnswerOutcome
}): string | null {
  const term = row.accepted[0]

  return row.outcome !== 'correct' &&
    term &&
    /^[a-z][a-z' -]{1,40}$/i.test(term) &&
    term.split(' ').length <= 3
    ? term
    : null
}

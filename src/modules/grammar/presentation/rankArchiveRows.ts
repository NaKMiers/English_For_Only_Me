import type { GrammarL1Risk } from '@/modules/grammar/types'

export interface ArchiveCandidate {
  cefrLevel: string
  family: string
  isUnverified: boolean
  l1RiskRank: number
  pointSlug: string
  recallStage: number
  title: string
  wrongCount: number
}

/**
 * Order the rules that keep beating this learner.
 *
 * Wrong count first, because that is the plainest statement of "this one has
 * cost you the most". Then the LOWEST ladder stage, so a rule you are still
 * failing outranks one you failed often but have since beaten. Then effective
 * risk, so between two equally-bruising rules the one your first language is
 * fighting comes first.
 *
 * Ties break on slug, so the page does not reshuffle between visits - a list
 * that reorders itself for no reason reads as noise rather than as a record.
 *
 * Pure, so the ranking is testable without a database.
 */
export function rankArchiveRows(
  candidates: ArchiveCandidate[]
): ArchiveCandidate[] {
  return [...candidates].sort((left, right) => {
    if (left.wrongCount !== right.wrongCount)
      return right.wrongCount - left.wrongCount

    if (left.recallStage !== right.recallStage)
      return left.recallStage - right.recallStage

    if (left.l1RiskRank !== right.l1RiskRank)
      return right.l1RiskRank - left.l1RiskRank

    return left.pointSlug.localeCompare(right.pointSlug)
  })
}

/**
 * Which of the learner's own sentences to quote on a row.
 *
 * The repeated mistake beats the first one: a pattern says more than a slip.
 * Falls through to nothing rather than inventing something to show.
 *
 * A `revealed` answer is NEVER quotable, and that rule lives upstream in
 * `buildScarRecord`, which only ever considers `wrong` attempts - the learner
 * did not write a revealed answer, so quoting it back at them would be putting
 * words in their mouth.
 */
export function pickArchiveQuote(
  scar: {
    firstWrong: { prompt: string | null; userAnswer: string } | null
    worstTrap: {
      occurrences: number
      prompt: string | null
      userAnswer: string
    } | null
  } | null
) {
  if (!scar) return null

  if (scar.worstTrap)
    return {
      occurrences: scar.worstTrap.occurrences,
      prompt: scar.worstTrap.prompt,
      userAnswer: scar.worstTrap.userAnswer,
    }

  if (scar.firstWrong)
    return {
      occurrences: 1,
      prompt: scar.firstWrong.prompt,
      userAnswer: scar.firstWrong.userAnswer,
    }

  return null
}

export const GRAMMAR_L1_RISK_LABEL: Record<GrammarL1Risk, string> = {
  high: 'high interference',
  low: 'low interference',
  medium: 'some interference',
}

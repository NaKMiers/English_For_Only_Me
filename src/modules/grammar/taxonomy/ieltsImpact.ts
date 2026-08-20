import {
  GRAMMAR_HIGH_IELTS_IMPACT_MIN_COMPLEXITY,
  GRAMMAR_RANGE_FAMILIES,
} from '@/modules/grammar/constants'
import type {
  GrammarComplexity,
  GrammarFamily,
  GrammarIeltsImpact,
} from '@/modules/grammar/types'

/**
 * `ieltsImpact` is derived, never stored (eng review D13).
 *
 * The axis is real and NOT redundant with `l1Risk`: they diverge in both
 * directions. Structure range (relative clauses, conditionals, inversion,
 * passive) is high band impact and low L1 risk for a Vietnamese speaker.
 * Plural `-s` is the reverse - high L1 risk, but an examiner treats it as a
 * minor accuracy slip rather than a band ceiling.
 *
 * Deriving it costs zero authoring across ~180 taxonomy rows, keeps the tuning
 * in one unit-tested function instead of 180 edits, and does not reopen the
 * taxonomy contract that premise 2 calls expensive to change once content has
 * been generated against it.
 *
 *   complexity >= 4            ──┐
 *   OR family is a range family ──┴──► high
 *   complexity === 3                 ──► medium
 *   otherwise                        ──► low
 *
 * `ieltsImpactOverride` on a point always wins, for the cases the formula gets
 * wrong. Same escape-hatch shape as `acceptedAnswers` in the grading path.
 */
export function deriveIeltsImpact({
  complexity,
  family,
  override = null,
}: {
  complexity: GrammarComplexity
  family: GrammarFamily
  override?: GrammarIeltsImpact | null
}): GrammarIeltsImpact {
  if (override) return override

  const isRangeFamily = (GRAMMAR_RANGE_FAMILIES as readonly string[]).includes(
    family
  )

  if (complexity >= GRAMMAR_HIGH_IELTS_IMPACT_MIN_COMPLEXITY || isRangeFamily)
    return 'high'

  if (complexity === 3) return 'medium'

  return 'low'
}

import { GRAMMAR_L1_RISK_RANK } from '@/modules/grammar/constants'
import type { GrammarL1Risk } from '@/modules/grammar/types'

/**
 * The L1 risk to use for anything that ranks, sorts, or colours by difficulty.
 *
 * There are two risk values on a point and mixing them up is a bug farm, so the
 * split is worth stating plainly:
 *
 * - `l1Risk` is a CONTENT CONTRACT. `getRequiredDrillCount` returns 12 for
 *   `high` and 8 otherwise, and `requiresVietnameseExplanation` fires on
 *   `high`. Both run inside `grammar:validate`, which runs in the test step. So
 *   raising `l1Risk` on a point whose lesson has 8 drills and no Vietnamese
 *   explanation does not record an opinion, it breaks the build. Measured
 *   against the real taxonomy: 114 of the 117 non-high points would fail.
 * - `l1RiskObserved` is the builder's LIVED JUDGMENT, recorded after actually
 *   reading the point. Optional, and absent on a row that has not been judged
 *   yet - which is what makes the 184-row pass resumable.
 *
 * Every consumer that ranks or presents reads the effective value; the two
 * requirement functions keep reading `l1Risk` alone. The single integration
 * point is `l1RiskRank` at seed time, so browse order, the admin review queue
 * and every existing index inherit the judgment with no other code change.
 */
export function effectiveL1Risk(point: {
  l1Risk: GrammarL1Risk
  l1RiskObserved?: GrammarL1Risk | null
}): GrammarL1Risk {
  return point.l1RiskObserved ?? point.l1Risk
}

/**
 * Does the builder's judgment disagree with the authored risk? The
 * disagreement is information: it is the queue of points whose content does not
 * yet match how hard they actually are.
 */
export function hasL1RiskDivergence(point: {
  l1Risk: GrammarL1Risk
  l1RiskObserved?: GrammarL1Risk | null
}): boolean {
  return point.l1RiskObserved != null && point.l1RiskObserved !== point.l1Risk
}

/**
 * The stored sort key written at seed time.
 *
 * Extracted from the seed script so the one line that carries the builder's
 * judgment into every risk-ordered query is covered by a test rather than only
 * by running the seed against a real database.
 */
export function resolveL1RiskRank(point: {
  l1Risk: GrammarL1Risk
  l1RiskObserved?: GrammarL1Risk | null
}): number {
  return (
    GRAMMAR_L1_RISK_RANK[effectiveL1Risk(point)] ?? GRAMMAR_L1_RISK_RANK.medium
  )
}

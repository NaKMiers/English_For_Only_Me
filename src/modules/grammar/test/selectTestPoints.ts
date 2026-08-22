import { GRAMMAR_L1_RISK_RANK } from '../constants'
import { effectiveL1Risk } from '../taxonomy/effectiveL1Risk'

import type { GrammarTestCandidate, GrammarTestConfig } from './types'

export interface SelectTestPointsResult {
  points: GrammarTestCandidate[]
  /**
   * How many questions the learner asked for and cannot have, because not
   * enough points matched. Surfaced rather than swallowed: a test that quietly
   * returns 6 questions when you asked for 20 reads as a bug.
   */
  shortfall: number
}

function matchesFilters(
  candidate: GrammarTestCandidate,
  config: GrammarTestConfig
) {
  // Empty means "no constraint on this axis". Getting this backwards makes the
  // default configuration select nothing at all.
  if (
    config.cefrLevels.length > 0 &&
    !config.cefrLevels.includes(candidate.cefrLevel)
  )
    return false

  if (config.families.length > 0 && !config.families.includes(candidate.family))
    return false

  if (
    config.complexities.length > 0 &&
    !config.complexities.includes(candidate.complexity)
  )
    return false

  // Filters on the EFFECTIVE risk, so a point the builder has re-judged is
  // filtered by that judgment rather than by the stale authored value. Same
  // rule the browse list and the dungeon map already follow.
  if (
    config.l1Risks.length > 0 &&
    !config.l1Risks.includes(effectiveL1Risk(candidate))
  )
    return false

  return true
}

function matchesScope(
  candidate: GrammarTestCandidate,
  config: GrammarTestConfig,
  dueSlugs: Set<string>
) {
  switch (config.scope) {
    case 'learning':
      return candidate.status === 'learning'
    case 'due':
      return dueSlugs.has(candidate.slug)
    case 'untouched':
      return candidate.status === null
    case 'mastered':
      return candidate.status === 'mastered'
    case 'all':
    default:
      return true
  }
}

/**
 * Choose which points this test asks about.
 *
 * ```
 *   all points with drills
 *         |
 *         v
 *   drop status 'ignored'              <- never resurrect a silenced point
 *         |
 *         v
 *   apply scope (all/learning/due/untouched/mastered)
 *         |
 *         v
 *   apply filters (level, family, complexity, effective L1 risk)
 *         |
 *         v
 *   rank: effective L1 risk desc, then complexity desc, then slug
 *         |
 *         v
 *   take questionCount, report the shortfall
 * ```
 *
 * `ignored` is dropped before anything else, and dropped from EVERY scope
 * including `all`. It is the one status that is an instruction rather than an
 * observation: the learner said stop showing me this. A wrong answer on such a
 * point would otherwise set it back to `learning` and put it straight back in
 * the daily queue, which reads as the app overruling them. `mastered` and
 * `alreadyKnow` are claims about ability, and a test exists to falsify those.
 *
 * Ranking by risk rather than shuffling is deliberate. When the learner asks
 * for 10 questions out of 184 eligible points, the ten that teach the most are
 * the ones where a Vietnamese speaker is most likely to be wrong - the same
 * reasoning the retired placement diagnostic used for its risk weighting, kept
 * now that the weighting itself is gone. Ties break on slug so the same
 * configuration is reproducible.
 *
 * Pure, so every scope and filter is testable without a database.
 */
export function selectTestPoints({
  candidates,
  config,
  dueSlugs = new Set<string>(),
}: {
  candidates: GrammarTestCandidate[]
  config: GrammarTestConfig
  /**
   * Which of these points are due now. Passed in rather than derived from a
   * clock, because "due" lives on the learner's item row and the caller has
   * already queried it - recomputing here would mean passing dueAt per point
   * for one boolean.
   */
  dueSlugs?: Set<string>
}): SelectTestPointsResult {
  const eligible = candidates
    .filter(candidate => candidate.status !== 'ignored')
    .filter(candidate => matchesScope(candidate, config, dueSlugs))
    .filter(candidate => matchesFilters(candidate, config))

  const ranked = [...eligible].sort((left, right) => {
    const riskGap =
      GRAMMAR_L1_RISK_RANK[effectiveL1Risk(right)] -
      GRAMMAR_L1_RISK_RANK[effectiveL1Risk(left)]

    if (riskGap !== 0) return riskGap
    if (left.complexity !== right.complexity)
      return right.complexity - left.complexity

    return left.slug.localeCompare(right.slug)
  })

  const points = ranked.slice(0, config.questionCount)

  return {
    points,
    shortfall: Math.max(0, config.questionCount - points.length),
  }
}

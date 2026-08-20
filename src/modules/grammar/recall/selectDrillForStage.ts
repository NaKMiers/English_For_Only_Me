import { createHash } from 'crypto'

import type { GrammarDrillRecord } from '@/modules/grammar/types'

/**
 * Pick which drill to serve for a point at a given ladder stage.
 *
 * Two goals, in tension:
 *
 *   1. Do not repeat an item before the learner has mastered the rule. Seeing
 *      the same sentence twice tests memory of that sentence, not understanding
 *      of the grammar. This is why `grammar:validate` enforces at least 8 drills
 *      per point (12 for high L1 risk) - one more than the ladder has rungs.
 *   2. Get harder as the learner climbs. Early stages should not open with the
 *      hardest production item.
 *
 * So drills are ordered by difficulty and indexed by stage. A deterministic
 * per-point offset keeps two points from always serving their drills in
 * lockstep, without making the choice unpredictable across a retry - the same
 * (slug, stage) always yields the same drill, which matters because the answer
 * route re-resolves the drill server-side.
 *
 * Pure and separated from any query so it is testable without a database.
 */
export function selectDrillForStage({
  drills,
  pointSlug,
  stage,
}: {
  drills: GrammarDrillRecord[]
  pointSlug: string
  stage: number
}): GrammarDrillRecord | null {
  if (drills.length === 0) return null

  const ordered = [...drills].sort((left, right) => {
    if (left.difficulty !== right.difficulty)
      return left.difficulty - right.difficulty

    return left.id.localeCompare(right.id)
  })

  const offset = Number.parseInt(
    createHash('sha1').update(pointSlug).digest('hex').slice(0, 8),
    16
  )
  const index = (Math.max(1, stage) - 1 + offset) % ordered.length

  return ordered[index]
}

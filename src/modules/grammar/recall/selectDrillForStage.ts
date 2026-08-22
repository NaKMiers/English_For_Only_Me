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
 *
 * GENERATED DRILLS ARE EXCLUDED HERE. The on-demand test appends AI-authored
 * drills to the same array this reads, which would put unreviewed machine
 * output into the learner's daily review the moment they took a test. That is
 * the one place it must never appear: `constants.ts` already records what
 * generated content did to `acceptedAnswers` when it was trusted by default -
 * it listed "Please close door." as a correct answer on a drill about the
 * definite article. Recall is the surface where a bad drill teaches a wrong
 * form for weeks before anyone notices, so promotion into it stays a human act
 * via `grammar:export`.
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
  const reviewed = drills.filter(candidate => !candidate.generated)

  if (reviewed.length === 0) return null

  const ordered = [...reviewed].sort((left, right) => {
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

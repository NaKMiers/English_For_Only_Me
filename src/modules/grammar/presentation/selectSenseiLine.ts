import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type { GrammarL1Risk } from '@/modules/grammar/types'

import {
  SENSEI_HIGH_FRICTION_WRONG_COUNT,
  SENSEI_LINES,
  SENSEI_STALE_DAYS,
  SENSEI_STREAK_THRESHOLD,
} from './senseiLines'
import type { LearnerPresentationState } from './types'

const DAY_MS = 86_400_000

/** Which rung of the ladder fired. Returned so the choice is inspectable. */
export type SenseiRung =
  | 'regression'
  | 'terminal'
  | 'streak'
  | 'highFriction'
  | 'stale'
  | 'untouched'
  | 'default'

export interface SenseiSelection {
  line: string
  rung: SenseiRung
}

/**
 * Choose exactly one line, by precedence, highest first, first match wins.
 *
 * One line per verdict beat is a hard rule. A sensei who says three things at
 * once is a notification tray, and the whole effect depends on him saying the
 * single most useful thing and then stopping.
 *
 * The order is a claim about what a learner most needs to hear:
 *
 *   1. regression   - a point going backwards is the most actionable fact there is
 *   2. terminal     - if they have closed the point out, nothing else applies
 *   3. streak       - the one compliment, and it outranks criticism
 *   4. highFriction - a specific number of failures beats a general remark
 *   5. stale        - a point going cold is worth naming before difficulty is
 *   6. untouched    - nothing to say about performance, so say that
 *   7. default      - the point's own difficulty, which is always true
 *
 * Pure and total: every input reaches a line. Returning null would mean a
 * verdict panel with an empty speech bubble.
 */
export function selectSenseiLine({
  learnerState,
  now = new Date(),
  point,
}: {
  learnerState: LearnerPresentationState
  now?: Date
  point: { l1Risk: GrammarL1Risk; l1RiskObserved?: GrammarL1Risk | null }
}): SenseiSelection {
  if (learnerState.recentOutcome !== 'correct' && learnerState.revivalCount > 0)
    return { line: SENSEI_LINES.regression, rung: 'regression' }

  if (learnerState.status === 'mastered')
    return { line: SENSEI_LINES.mastered, rung: 'terminal' }

  if (learnerState.status === 'alreadyKnow')
    return { line: SENSEI_LINES.alreadyKnow, rung: 'terminal' }

  if (learnerState.correctAnswerStreak >= SENSEI_STREAK_THRESHOLD)
    return { line: SENSEI_LINES.streak, rung: 'streak' }

  if (learnerState.wrongCount >= SENSEI_HIGH_FRICTION_WRONG_COUNT)
    return {
      line: SENSEI_LINES.highFriction(learnerState.wrongCount),
      rung: 'highFriction',
    }

  const staleDays = daysSince(learnerState.lastReviewedAt, now)

  if (staleDays != null && staleDays >= SENSEI_STALE_DAYS)
    return { line: SENSEI_LINES.stale(staleDays), rung: 'stale' }

  if (learnerState.status === null)
    return { line: SENSEI_LINES.untouched, rung: 'untouched' }

  return { line: SENSEI_LINES.default[effectiveL1Risk(point)], rung: 'default' }
}

function daysSince(iso: string | null, now: Date) {
  if (!iso) return null

  const at = new Date(iso).getTime()

  if (Number.isNaN(at)) return null

  return Math.floor((now.getTime() - at) / DAY_MS)
}

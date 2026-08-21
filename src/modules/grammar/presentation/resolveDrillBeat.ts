import { SENSEI_LINES } from './senseiLines'
import type { SenseiExpression } from './senseiExpressions'

export type DrillVerdict = 'correct' | 'wrong' | 'revealed'

export interface DrillBeat {
  /** What `CreatureMotion` should play. Null when nothing should move. */
  creatureOutcome: 'correct' | 'wrong' | 'revive' | null
  expression: SenseiExpression
  /** True where the ladder went backwards on this submission. */
  isRegression: boolean
  line: string
  /** The stamp text, or null where a hit did not land. */
  stamp: string | null
  stampTone: 'ink' | 'danger'
}

/**
 * What the page does when a drill is answered.
 *
 * The mapping is deliberately asymmetric, because the feedback is the teaching:
 *
 * - `correct` lands a hit. The stamp, the flinch, one rung off the health bar.
 * - `wrong` does NOT move the creature. It is unmoved, and that is the message -
 *   the token-level correction diff below it does the actual work.
 * - `revealed` gets nothing. No stamp, no motion, no praise and no scolding. The
 *   learner looked at the answer, and acknowledging it either way would be
 *   pretending it counted.
 *
 * A regression is a LADDER MOVEMENT, not a verdict: it can accompany a wrong
 * answer or a revealed one, and it outranks both for the line, because a rule
 * you had and lost is the most useful thing to be told.
 *
 * Pure, so all four outcomes and both regression cases are testable without
 * rendering anything.
 */
export function resolveDrillBeat({
  stageAfter,
  stageBefore,
  verdict,
}: {
  stageAfter: number
  stageBefore: number
  verdict: DrillVerdict
}): DrillBeat {
  const isRegression = stageAfter < stageBefore

  if (verdict === 'correct')
    return {
      creatureOutcome: 'correct',
      expression: 'approving',
      isRegression: false,
      line: SENSEI_LINES.correct,
      stamp: 'Hit',
      stampTone: 'ink',
    }

  if (isRegression)
    return {
      // The creature comes back: the silhouette refills and the bar climbs.
      creatureOutcome: 'revive',
      expression: 'weary',
      isRegression: true,
      line: SENSEI_LINES.regression,
      stamp: null,
      stampTone: 'danger',
    }

  if (verdict === 'revealed')
    return {
      creatureOutcome: null,
      expression: 'unimpressed',
      isRegression: false,
      line: SENSEI_LINES.revealed,
      stamp: null,
      stampTone: 'danger',
    }

  return {
    creatureOutcome: 'wrong',
    expression: 'severe',
    isRegression: false,
    line: SENSEI_LINES.wrong,
    stamp: null,
    stampTone: 'danger',
  }
}

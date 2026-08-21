import type { ScarRecord } from './types'

/** The fields the archive needs off an attempt row. Nothing else is read. */
export interface ScarAttempt {
  at: Date | string
  drillId: string
  matchedAnswer?: string | null
  stageAfter: number
  stageBefore: number
  userAnswer?: string | null
  verdict: string
}

/**
 * Normalise an answer the way a human would judge "the same mistake twice".
 *
 * Case and whitespace only. Deliberately NOT the grader's normaliser, which
 * also strips terminal punctuation: "the durian?" and "the durian" are one
 * answer to the grader but two different things a learner typed, and the
 * archive is quoting what they typed.
 */
function normalise(answer: string) {
  return answer.trim().toLowerCase().replace(/\s+/g, ' ')
}

function toIso(at: Date | string) {
  return at instanceof Date ? at.toISOString() : new Date(at).toISOString()
}

/**
 * Aggregate one learner's history on one point into the four things worth
 * saying about it.
 *
 * Pure, and separated from the query so every field can be tested against plain
 * objects - including the cases that only show up on real history: a drill that
 * no longer exists, a single wrong answer that is not yet a pattern, a point
 * beaten and then lost again.
 *
 * `promptByDrillId` is resolved by the caller from the Mongo document. It is a
 * prompt map and NOT a drill map on purpose: `GrammarDrillRecord` carries
 * `target` and `acceptedAnswers`, and this record is rendered into a page. A
 * prompt is the only field from a drill that may travel.
 */
export function buildScarRecord({
  attempts,
  promptByDrillId,
}: {
  /** Any order; this sorts. */
  attempts: ScarAttempt[]
  promptByDrillId: Map<string, string>
}): ScarRecord {
  const chronological = [...attempts].sort(
    (left, right) => new Date(left.at).getTime() - new Date(right.at).getTime()
  )
  const wrongs = chronological.filter(attempt => attempt.verdict === 'wrong')

  return {
    conquered: findConquered(chronological, promptByDrillId),
    firstWrong: findFirstWrong(wrongs, promptByDrillId),
    // A regression is the ladder moving backwards, which can accompany a wrong
    // answer or a revealed one. Counted off the stage change, not the verdict.
    revivals: chronological.filter(
      attempt => attempt.stageAfter < attempt.stageBefore
    ).length,
    worstTrap: findWorstTrap(wrongs, promptByDrillId),
  }
}

function findFirstWrong(
  wrongs: ScarAttempt[],
  promptByDrillId: Map<string, string>
): ScarRecord['firstWrong'] {
  const first = wrongs[0]

  if (!first?.userAnswer) return null

  return {
    at: toIso(first.at),
    matchedAnswer: first.matchedAnswer ?? null,
    prompt: promptByDrillId.get(first.drillId) ?? null,
    userAnswer: first.userAnswer,
  }
}

/**
 * The answer the learner keeps writing.
 *
 * Two occurrences minimum: one wrong answer is a slip, and calling it a pattern
 * would be the module inventing a weakness. Ties break on the most recent
 * attempt, so a trap the learner has moved past does not outrank a live one.
 */
function findWorstTrap(
  wrongs: ScarAttempt[],
  promptByDrillId: Map<string, string>
): ScarRecord['worstTrap'] {
  const groups = new Map<
    string,
    { at: number; drillId: string; occurrences: number; userAnswer: string }
  >()

  for (const attempt of wrongs) {
    if (!attempt.userAnswer) continue

    const key = normalise(attempt.userAnswer)

    if (!key) continue

    const at = new Date(attempt.at).getTime()
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        at,
        drillId: attempt.drillId,
        occurrences: 1,
        userAnswer: attempt.userAnswer,
      })
      continue
    }

    existing.occurrences += 1

    // Quote the most recent wording, so the learner reads what they last wrote
    // rather than a months-old variant of the same mistake.
    if (at >= existing.at) {
      existing.at = at
      existing.drillId = attempt.drillId
      existing.userAnswer = attempt.userAnswer
    }
  }

  const ranked = [...groups.values()]
    .filter(group => group.occurrences >= 2)
    .sort((left, right) =>
      left.occurrences !== right.occurrences
        ? right.occurrences - left.occurrences
        : right.at - left.at
    )
  const worst = ranked[0]

  if (!worst) return null

  return {
    occurrences: worst.occurrences,
    prompt: promptByDrillId.get(worst.drillId) ?? null,
    userAnswer: worst.userAnswer,
  }
}

/**
 * The moment the point stopped winning: the first attempt that carried the
 * learner from the lower half of the ladder into the upper half.
 */
function findConquered(
  chronological: ScarAttempt[],
  promptByDrillId: Map<string, string>
): ScarRecord['conquered'] {
  const crossing = chronological.find(
    attempt => attempt.stageBefore <= 4 && attempt.stageAfter >= 5
  )

  if (!crossing) return null

  return {
    at: toIso(crossing.at),
    prompt: promptByDrillId.get(crossing.drillId) ?? null,
    userAnswer: crossing.userAnswer ?? '',
  }
}

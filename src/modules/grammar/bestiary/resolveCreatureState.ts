import type {
  GrammarReviewStatus,
  GrammarUserItemStatus,
} from '@/modules/grammar/types'

/**
 * How defeated the creature looks. Comes from the learner's progress.
 */
export type CreaturePosture =
  'untouched' | 'fighting' | 'skipped' | 'defeated' | 'dismissed'

/**
 * How REAL the creature looks. Comes from whether a human has read the lesson.
 *
 * `ghost` is the launch state for all 184 points, and it is the honest one: the
 * explanation behind this creature was written by a model and checked by nobody.
 */
export type CreatureSolidity = 'ghost' | 'solid'

export interface CreatureState {
  /** True where the learner has finished with the point, however they finished. */
  isResolved: boolean
  posture: CreaturePosture
  solidity: CreatureSolidity
}

/**
 * Two independent axes, deliberately not collapsed into one enum.
 *
 * `status` is the learner's progress and `reviewStatus` is whether a human has
 * read the lesson, and nothing in the module couples them - `resolveGrammarAnswer`
 * never consults `reviewStatus`, so mastering an unverified point is reachable
 * today and lands on the cell that reads "defeated, but it was never real".
 * That cell is the whole reason for the split: verifying a mastered point is the
 * moment a hollow win becomes a real one.
 *
 *   reviewStatus ->      unverified              reviewed
 *   status
 *   -----------------+----------------------+----------------------
 *   (no row)         |  fog + ghost         |  fog + solid
 *   learning         |  ghost, HP bar       |  solid, HP bar
 *   alreadyKnow      |  ghost outline       |  grey outline
 *   mastered         |  GHOST SILHOUETTE    |  black silhouette
 *   ignored          |  crossed out         |  crossed out
 *
 * `ignored` changes appearance only. It stays inside the map's counts, because
 * `buildProgressCells` counts every point and the stats projection is not this
 * plan's to change.
 */
export function resolveCreatureState({
  reviewStatus,
  status,
}: {
  reviewStatus: GrammarReviewStatus
  /** Null when the learner has no item row for this point yet. */
  status: GrammarUserItemStatus | null
}): CreatureState {
  const posture = resolvePosture(status)

  return {
    isResolved:
      posture === 'defeated' ||
      posture === 'skipped' ||
      posture === 'dismissed',
    posture,
    solidity: reviewStatus === 'reviewed' ? 'solid' : 'ghost',
  }
}

function resolvePosture(status: GrammarUserItemStatus | null): CreaturePosture {
  switch (status) {
    case 'learning':
      return 'fighting'
    case 'alreadyKnow':
      return 'skipped'
    case 'mastered':
      return 'defeated'
    case 'ignored':
      return 'dismissed'
    default:
      return 'untouched'
  }
}

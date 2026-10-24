import type {
  GrammarCefrLevel,
  GrammarFamily,
  GrammarL1Risk,
  GrammarPointLearnerState,
  GrammarReviewStatus,
  GrammarUserItemStatus,
} from '@/modules/grammar/types'

import type { ParsedGrammarPointsQuery } from './grammarRouteDecisions'

/**
 * What one leaf on the /grammar/points map reads, and nothing more. The map
 * used to load every point document whole (explanations, drills, examples,
 * mistakes) to draw a title and a dot.
 */
export interface GrammarMapPoint {
  cefrLevel: GrammarCefrLevel
  family: GrammarFamily
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  reviewStatus: GrammarReviewStatus
  slug: string
  title: string
}

export interface GrammarMapLeaf extends GrammarMapPoint {
  learner: GrammarPointLearnerState | null
}

export interface GrammarMapResult {
  points: GrammarMapLeaf[]
  total: number
}

export const GRAMMAR_MAP_POINT_FIELDS =
  'slug title cefrLevel family l1Risk l1RiskObserved reviewStatus'

/** The content half of the map query: everything but the learner's filter. */
export type GrammarMapContentQuery = Pick<
  ParsedGrammarPointsQuery,
  'cefrLevel' | 'complexity' | 'family' | 'l1Risk' | 'q' | 'reviewStatus'
>

export function toGrammarMapPoint(point: {
  cefrLevel: string
  family: string
  l1Risk: string
  l1RiskObserved?: string | null
  reviewStatus: string
  slug: string
  title: string
}): GrammarMapPoint {
  return {
    cefrLevel: point.cefrLevel as GrammarCefrLevel,
    family: point.family as GrammarFamily,
    l1Risk: point.l1Risk as GrammarL1Risk,
    l1RiskObserved: (point.l1RiskObserved ?? null) as GrammarL1Risk | null,
    reviewStatus: point.reviewStatus as GrammarReviewStatus,
    slug: point.slug,
    title: point.title,
  }
}

export interface GrammarMapItem {
  dueAt?: Date | null
  pointSlug: string
  recallStage: number
  status: string
}

/**
 * Does a point pass the learner's study filter? The in-memory twin of
 * `resolveStudySlugFilter`: `notStarted` is the absence of a row, `due` is a
 * learning row whose dueAt has passed, anything else is an exact status.
 */
export function matchesStudyFilter({
  item,
  now,
  studyStatus,
}: {
  item: GrammarMapItem | undefined
  now: Date
  studyStatus: ParsedGrammarPointsQuery['studyStatus']
}) {
  if (!studyStatus) return true
  if (studyStatus === 'notStarted') return !item
  if (!item) return false
  if (studyStatus === 'due')
    return (
      item.status === 'learning' &&
      item.dueAt != null &&
      item.dueAt.getTime() <= now.getTime()
    )

  return item.status === studyStatus
}

/**
 * Join the shared (cached, already sorted) map points with one learner's rows,
 * apply the study filter, then cap. Filtering before the cap is what keeps
 * `total` equal to what a countDocuments over the same filter would say.
 */
export function buildGrammarMapResult({
  items,
  limit,
  now = new Date(),
  points,
  studyStatus,
}: {
  items: GrammarMapItem[]
  limit: number
  now?: Date
  points: GrammarMapPoint[]
  studyStatus: ParsedGrammarPointsQuery['studyStatus']
}): GrammarMapResult {
  const itemBySlug = new Map(items.map(item => [item.pointSlug, item]))
  const matching = points.filter(point =>
    matchesStudyFilter({ item: itemBySlug.get(point.slug), now, studyStatus })
  )

  return {
    points: matching.slice(0, limit).map(point => {
      const item = itemBySlug.get(point.slug)

      return {
        ...point,
        learner: item
          ? {
              dueAt: item.dueAt ? item.dueAt.toISOString() : null,
              recallStage: item.recallStage,
              status: item.status as GrammarUserItemStatus,
            }
          : null,
      }
    }),
    total: matching.length,
  }
}

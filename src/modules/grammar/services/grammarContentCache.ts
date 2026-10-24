import 'server-only'

import { CACHE_TAGS, createCatalogReader } from '@/lib/db/catalogCache'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarFamily,
  GrammarL1Risk,
  GrammarReviewStatus,
} from '@/modules/grammar/types'

import {
  GRAMMAR_MAP_POINT_FIELDS,
  type GrammarMapContentQuery,
  type GrammarMapPoint,
  toGrammarMapPoint,
} from './grammarMapPoints'
import {
  buildGrammarPointFilter,
  getGrammarBrowseSort,
  getGrammarLesson,
} from './grammarPointListService'

/**
 * Cached reads of the shared grammar content. Lessons change only when the
 * seed runs or an admin reviews one, so every learner can share one copy.
 * Invalidated by CACHE_TAGS.grammarContent (admin review route, the seed
 * script via /api/admin/revalidate). Per-learner rows are never cached here.
 *
 * Every record is already JSON-safe (dates are ISO strings in the grammar
 * API shapes), so revive is the identity.
 */

/**
 * The taxonomy is ~184 points; a runaway filter can still never read more than
 * this many rows.
 */
const MAP_SCAN_CAP = 1000

export interface GrammarTaxonomyPoint {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  family: GrammarFamily
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  reviewStatus: GrammarReviewStatus
  slug: string
}

export interface GrammarTaxonomy {
  points: GrammarTaxonomyPoint[]
  /** Live points with a written lesson body. */
  withLessonCount: number
}

export const getCachedGrammarLesson = createCatalogReader({
  key: 'grammar-lesson',
  load: getGrammarLesson,
  revive: lesson => lesson,
  tag: CACHE_TAGS.grammarContent,
})

async function loadGrammarTaxonomy(): Promise<GrammarTaxonomy> {
  const [points, withLessonCount] = await Promise.all([
    GrammarPointModel.find({ mergedInto: null })
      .select(
        'slug cefrLevel complexity family l1Risk l1RiskObserved reviewStatus'
      )
      .lean(),
    GrammarPointModel.countDocuments({
      explanation: { $ne: null },
      mergedInto: null,
    }),
  ])

  return {
    points: points.map(point => ({
      cefrLevel: point.cefrLevel as GrammarCefrLevel,
      complexity: point.complexity as GrammarComplexity,
      family: point.family as GrammarFamily,
      l1Risk: point.l1Risk as GrammarL1Risk,
      l1RiskObserved: (point.l1RiskObserved ?? null) as GrammarL1Risk | null,
      reviewStatus: point.reviewStatus as GrammarReviewStatus,
      slug: point.slug,
    })),
    withLessonCount,
  }
}

/** Every live point's taxonomy fields, plus the written-lesson count. */
export const getCachedGrammarTaxonomy = createCatalogReader({
  key: 'grammar-taxonomy',
  load: loadGrammarTaxonomy,
  revive: taxonomy => taxonomy,
  tag: CACHE_TAGS.grammarContent,
})

async function loadGrammarMapPoints(
  cefrLevel: GrammarMapContentQuery['cefrLevel'],
  complexity: GrammarMapContentQuery['complexity'],
  family: GrammarMapContentQuery['family'],
  l1Risk: GrammarMapContentQuery['l1Risk'],
  q: GrammarMapContentQuery['q'],
  reviewStatus: GrammarMapContentQuery['reviewStatus']
): Promise<GrammarMapPoint[]> {
  const filter = buildGrammarPointFilter({
    cefrLevel,
    complexity,
    family,
    l1Risk,
    q,
    reviewStatus,
  })

  const points = await GrammarPointModel.find(filter)
    .sort(getGrammarBrowseSort())
    .limit(MAP_SCAN_CAP)
    .select(GRAMMAR_MAP_POINT_FIELDS)
    .lean()

  return points.map(toGrammarMapPoint)
}

const readGrammarMapPoints = createCatalogReader({
  key: 'grammar-map-points',
  load: loadGrammarMapPoints,
  revive: points => points,
  tag: CACHE_TAGS.grammarContent,
})

/**
 * Every point the content filters match, in browse order, projected to the
 * fields a map leaf draws. The learner's study filter is applied afterwards in
 * memory (buildGrammarMapResult), so this entry is shared by every learner.
 */
export function getCachedGrammarMapPoints(query: GrammarMapContentQuery) {
  return readGrammarMapPoints(
    query.cefrLevel ?? null,
    query.complexity ?? null,
    query.family ?? null,
    query.l1Risk ?? null,
    query.q ?? null,
    query.reviewStatus ?? null
  )
}

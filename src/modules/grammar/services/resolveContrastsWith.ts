import 'server-only'

import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarContrastRecord,
  GrammarFamily,
  GrammarL1Risk,
  GrammarReviewStatus,
} from '@/modules/grammar/types'

/**
 * Merge a point's own `contrastsWith` list with every point that names it.
 *
 * Contrast is a symmetric relation - present perfect only makes sense against
 * past simple, in both directions - but storing both directions means storing
 * the same fact twice and policing the copies with a validator. So it is
 * authored one-directionally and the reverse is derived here. The two
 * directions cannot disagree because only one is stored.
 *
 * Pure and separated from the query so the union and dedupe are testable
 * without a database.
 */
export function mergeContrastSlugs({
  ownContrasts,
  reverseContrasts,
  selfSlug,
}: {
  ownContrasts: string[]
  reverseContrasts: string[]
  selfSlug: string
}): string[] {
  const merged = new Set<string>()

  for (const slug of [...ownContrasts, ...reverseContrasts])
    if (slug && slug !== selfSlug) merged.add(slug)

  return [...merged].sort()
}

export async function resolveContrastsWith({
  ownContrasts,
  slug,
}: {
  ownContrasts: string[]
  slug: string
}): Promise<GrammarContrastRecord[]> {
  // Indexed on `contrastsWith`, so this is a lookup rather than a scan.
  const pointingBack = await GrammarPointModel.find({
    contrastsWith: slug,
    mergedInto: null,
  })
    .select('slug')
    .lean()

  const slugs = mergeContrastSlugs({
    ownContrasts,
    reverseContrasts: pointingBack.map(point => point.slug),
    selfSlug: slug,
  })

  if (slugs.length === 0) return []

  const points = await GrammarPointModel.find({
    mergedInto: null,
    slug: { $in: slugs },
  })
    // Wide enough to draw the rival as a creature, not just link to it.
    .select(
      'slug title summary cefrLevel complexity family l1Risk l1RiskObserved reviewStatus'
    )
    .lean()

  return points
    .map(point => ({
      cefrLevel: point.cefrLevel as GrammarCefrLevel,
      complexity: point.complexity as GrammarComplexity,
      family: point.family as GrammarFamily,
      l1Risk: point.l1Risk as GrammarL1Risk,
      l1RiskObserved: (point.l1RiskObserved ?? null) as GrammarL1Risk | null,
      reviewStatus: point.reviewStatus as GrammarReviewStatus,
      slug: point.slug,
      summary: point.summary,
      title: point.title,
    }))
    .sort((left, right) => left.title.localeCompare(right.title))
}

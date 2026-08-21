import type { GrammarContentFile, GrammarL1Risk } from '@/modules/grammar/types'

import { resolveL1RiskRank } from './effectiveL1Risk'

export interface L1RiskQueueEntry {
  cefrLevel: string
  complexity: number
  examples: { en: string; note: string | null; vi: string | null }[]
  family: string
  hasLesson: boolean
  l1Notes: string | null
  l1Risk: GrammarL1Risk
  l1RiskObserved: GrammarL1Risk | null
  slug: string
  summary: string
  title: string
}

/**
 * Order the taxonomy for the judgment pass, hardest first.
 *
 * Merge stubs are dropped: they carry no content to judge and their risk is
 * inherited from whatever they redirect to.
 *
 * Already-judged rows stay in the queue rather than being filtered out, so a
 * judgment can be revisited - but they sort after unjudged rows at the same
 * risk, which is what makes the pass resumable across sittings without the
 * builder tracking where they stopped.
 *
 * Carries examples and `l1Notes` and nothing from `drills`. Judging difficulty
 * needs sentences on screen; it never needs an answer key.
 */
export function buildL1RiskQueue(
  points: GrammarContentFile
): L1RiskQueueEntry[] {
  return points
    .filter(point => !point.mergedInto)
    .map(point => ({
      cefrLevel: point.cefrLevel,
      complexity: point.complexity,
      examples: (point.examples ?? []).map(example => ({
        en: example.en,
        note: example.note ?? null,
        vi: example.vi ?? null,
      })),
      family: point.family,
      hasLesson: Boolean(point.explanation),
      l1Notes: point.l1Notes ?? null,
      l1Risk: point.l1Risk,
      l1RiskObserved: point.l1RiskObserved ?? null,
      slug: point.slug,
      summary: point.summary,
      title: point.title,
    }))
    .sort((left, right) => {
      const byRank = resolveL1RiskRank(right) - resolveL1RiskRank(left)

      if (byRank !== 0) return byRank

      const byJudged =
        Number(left.l1RiskObserved != null) -
        Number(right.l1RiskObserved != null)

      if (byJudged !== 0) return byJudged

      if (left.complexity !== right.complexity)
        return right.complexity - left.complexity

      return left.slug.localeCompare(right.slug)
    })
}

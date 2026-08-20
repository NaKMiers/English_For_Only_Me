import type { GrammarPointDocument } from '@/models/grammar/GrammarPointModel'
import { deriveIeltsImpact } from '@/modules/grammar/taxonomy/ieltsImpact'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarFamily,
  GrammarIeltsImpact,
  GrammarL1Risk,
  GrammarPointApiRecord,
  GrammarReviewStatus,
} from '@/modules/grammar/types'

type LeanGrammarPoint = GrammarPointDocument & { _id: unknown }

/**
 * Map a Mongo document to the API shape.
 *
 * `ieltsImpact` is computed here rather than stored, so the whole system reads
 * one derivation and an override on a point always wins.
 */
export function toGrammarPointRecord(
  point: LeanGrammarPoint
): GrammarPointApiRecord {
  const complexity = point.complexity as GrammarComplexity
  const family = point.family as GrammarFamily

  return {
    cefrLevel: point.cefrLevel as GrammarCefrLevel,
    commonMistakes: (point.commonMistakes ?? []).map(mistake => ({
      right: mistake.right,
      why: mistake.why,
      wrong: mistake.wrong,
    })),
    complexity,
    contrastsWith: point.contrastsWith ?? [],
    minimalPairs: (point.minimalPairs ?? []).map(pair => ({
      meaning: pair.meaning,
      sentence: pair.sentence,
    })),
    drillCount: point.drills?.length ?? 0,
    examples: (point.examples ?? []).map(example => ({
      en: example.en,
      note: example.note ?? null,
      vi: example.vi ?? null,
    })),
    explanation: point.explanation ?? null,
    explanationVi: point.explanationVi ?? null,
    family,
    formPatterns: point.formPatterns ?? [],
    id: String(point._id),
    ieltsImpact: deriveIeltsImpact({
      complexity,
      family,
      override: (point.ieltsImpactOverride ??
        null) as GrammarIeltsImpact | null,
    }),
    ieltsImpactOverride: (point.ieltsImpactOverride ??
      null) as GrammarIeltsImpact | null,
    l1Notes: point.l1Notes ?? null,
    l1Risk: point.l1Risk as GrammarL1Risk,
    mergedInto: point.mergedInto ?? null,
    order: point.order,
    prerequisites: point.prerequisites ?? [],
    reviewStatus: point.reviewStatus as GrammarReviewStatus,
    reviewedAt: point.reviewedAt ? point.reviewedAt.toISOString() : null,
    slug: point.slug,
    summary: point.summary,
    title: point.title,
  }
}

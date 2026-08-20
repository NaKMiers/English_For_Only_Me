import { GRAMMAR_DIAGNOSTIC_RISK_WEIGHTS } from '@/modules/grammar/constants'
import type {
  GrammarCefrLevel,
  GrammarComplexity,
  GrammarDrillRecord,
  GrammarFamily,
  GrammarL1Risk,
} from '@/modules/grammar/types'

export interface DiagnosticCandidate {
  cefrLevel: GrammarCefrLevel
  complexity: GrammarComplexity
  drills: GrammarDrillRecord[]
  family: GrammarFamily
  l1Risk: GrammarL1Risk
  slug: string
  title: string
}

export interface DiagnosticItem {
  cefrLevel: GrammarCefrLevel
  choices: string[] | null
  complexity: GrammarComplexity
  drillId: string
  kind: GrammarDrillRecord['kind']
  l1Risk: GrammarL1Risk
  pointSlug: string
  pointTitle: string
  prompt: string
}

/**
 * Pick the single most diagnostic drill for a point.
 *
 * A placement test wants SIGNAL, not gentleness: the hardest available item
 * discriminates knowing from half-knowing far better than an easy one, where a
 * guess and real knowledge look identical. Ties break on id so selection stays
 * deterministic.
 */
function pickDiscriminatingDrill(drills: GrammarDrillRecord[]) {
  return [...drills].sort((left, right) => {
    if (left.difficulty !== right.difficulty)
      return right.difficulty - left.difficulty

    return left.id.localeCompare(right.id)
  })[0]
}

/**
 * Interleave across families so consecutive items come from different areas.
 *
 * Without this, ordering by difficulty would serve six verb-tense items in a
 * row - which measures one family deeply and the rest not at all, and makes the
 * test feel like a slog rather than a survey.
 */
function roundRobinByFamily(candidates: DiagnosticCandidate[]) {
  const byFamily = new Map<GrammarFamily, DiagnosticCandidate[]>()

  for (const candidate of candidates) {
    const bucket = byFamily.get(candidate.family) ?? []

    bucket.push(candidate)
    byFamily.set(candidate.family, bucket)
  }

  // Hardest first inside each family: those carry the most information.
  for (const bucket of byFamily.values())
    bucket.sort((left, right) => {
      if (left.complexity !== right.complexity)
        return right.complexity - left.complexity

      return left.slug.localeCompare(right.slug)
    })

  const families = [...byFamily.keys()].sort()
  const ordered: DiagnosticCandidate[] = []
  let added = true

  while (added) {
    added = false

    for (const family of families) {
      const next = byFamily.get(family)?.shift()

      if (!next) continue

      ordered.push(next)
      added = true
    }
  }

  return ordered
}

/**
 * Build a placement diagnostic.
 *
 * Weighted toward high `l1Risk` on purpose. A generic placement test spreads
 * evenly across CEFR levels, which spends most of its questions confirming
 * things a Vietnamese speaker was never likely to get wrong. Weighting by
 * first-language interference spends them where the answer is genuinely
 * uncertain, so the same number of questions yields far more information.
 *
 * Only points that actually have drills are eligible, so this degrades honestly
 * while most of the curriculum is still unwritten: a 3-item diagnostic today
 * becomes a 40-item one once `grammar:generate` has run, with no code change.
 *
 * Pure and separated from any query so the weighting and spread are testable.
 */
export function selectDiagnosticItems({
  candidates,
  limit,
  skipSlugs = new Set<string>(),
}: {
  candidates: DiagnosticCandidate[]
  limit: number
  /** Points the learner has already started. A placement test calibrates unknowns. */
  skipSlugs?: Set<string>
}): DiagnosticItem[] {
  const eligible = candidates.filter(
    candidate => candidate.drills.length > 0 && !skipSlugs.has(candidate.slug)
  )

  if (eligible.length === 0 || limit <= 0) return []

  const byRisk = new Map<GrammarL1Risk, DiagnosticCandidate[]>([
    ['high', []],
    ['low', []],
    ['medium', []],
  ])

  for (const candidate of eligible)
    byRisk.get(candidate.l1Risk)?.push(candidate)

  for (const [risk, bucket] of byRisk)
    byRisk.set(risk, roundRobinByFamily(bucket))

  const picked: DiagnosticCandidate[] = []
  const quotas = (['high', 'medium', 'low'] as const).map(risk => ({
    bucket: byRisk.get(risk) ?? [],
    quota: Math.round(limit * GRAMMAR_DIAGNOSTIC_RISK_WEIGHTS[risk]),
    risk,
  }))

  for (const { bucket, quota } of quotas)
    picked.push(...bucket.splice(0, quota))

  // Backfill from whatever is left if a bucket could not meet its quota, so a
  // thin curriculum still produces a full-length test.
  if (picked.length < limit)
    for (const { bucket } of quotas) {
      if (picked.length >= limit) break

      picked.push(...bucket.splice(0, limit - picked.length))
    }

  return picked.slice(0, limit).flatMap(candidate => {
    const drill = pickDiscriminatingDrill(candidate.drills)

    if (!drill) return []

    return [
      {
        cefrLevel: candidate.cefrLevel,
        choices: drill.choices ?? null,
        complexity: candidate.complexity,
        drillId: drill.id,
        kind: drill.kind,
        l1Risk: candidate.l1Risk,
        pointSlug: candidate.slug,
        pointTitle: candidate.title,
        prompt: drill.prompt,
      } satisfies DiagnosticItem,
    ]
  })
}

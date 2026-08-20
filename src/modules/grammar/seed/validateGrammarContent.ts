import {
  GRAMMAR_CEFR_LEVELS,
  GRAMMAR_COMPLEXITY_LEVELS,
  GRAMMAR_DRILL_KINDS,
  GRAMMAR_FAMILIES,
  GRAMMAR_IELTS_IMPACTS,
  GRAMMAR_L1_RISKS,
  GRAMMAR_MIN_DISTINCT_DRILL_KINDS,
  GRAMMAR_MIN_DRILLS_HIGH_L1_RISK,
  GRAMMAR_MIN_DRILLS_PER_POINT,
  GRAMMAR_PRODUCTION_DRILL_KINDS,
  GRAMMAR_REVIEW_STATUSES,
  GRAMMAR_VI_EXPLANATION_MIN_COMPLEXITY,
} from '@/modules/grammar/constants'
import type {
  GrammarContentFile,
  GrammarValidationIssue,
  GrammarValidationResult,
} from '@/modules/grammar/types'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function has<T>(list: readonly T[], value: unknown): boolean {
  return (list as readonly unknown[]).includes(value)
}

/**
 * Count accepted answers the way the GRADER sees them, not the way the array
 * looks.
 *
 * The grader normalises case, collapses whitespace, and trims terminal
 * punctuation before comparing, so "eaten durian" and "eaten durian?" are one
 * variant, not two. Counting raw array length let an author satisfy the
 * three-variant rule with punctuation noise while the drill still effectively
 * accepted a single wording - which is exactly the failure the rule exists to
 * prevent.
 *
 * Deliberately dependency-free rather than importing the grading normaliser:
 * this module runs inside a CLI script and must not pull in the server-only
 * correction chain.
 */
function normalizeAnswerForComparison(answer: string | undefined) {
  return (
    answer
      ?.trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[.!?;:,]+$/u, '') ?? ''
  )
}

function distinctAnswerSet(answers: string[] | undefined) {
  const seen = new Set<string>()

  for (const answer of answers ?? []) {
    const normalized = normalizeAnswerForComparison(answer)

    if (normalized) seen.add(normalized)
  }

  return seen
}

/**
 * Minimum number of drills a point needs, given its L1 risk.
 *
 * The ladder has 7 rungs, so 8 is the floor: fewer drills than rungs means a
 * learner meets the same item again before mastering the rule, which tests
 * recall of that sentence rather than understanding of the grammar. High-L1-risk
 * points get 12 because those are the ones a Vietnamese speaker resets to
 * stage 1 on repeatedly, so they cycle through far more material.
 */
export function getRequiredDrillCount(l1Risk: string) {
  return l1Risk === 'high'
    ? GRAMMAR_MIN_DRILLS_HIGH_L1_RISK
    : GRAMMAR_MIN_DRILLS_PER_POINT
}

/**
 * Does this point require a Vietnamese explanation alongside the English one?
 * True where difficulty is highest, which is where L1 support measurably helps
 * (eng review D12).
 */
export function requiresVietnameseExplanation({
  complexity,
  l1Risk,
}: {
  complexity: number
  l1Risk: string
}) {
  return (
    l1Risk === 'high' || complexity >= GRAMMAR_VI_EXPLANATION_MIN_COMPLEXITY
  )
}

/**
 * Validate the committed grammar content file.
 *
 * This is the guardrail that makes bulk AI-generated content safe to trust, and
 * it is deliberately written before the generator. It runs in the test step, so
 * a malformed or under-drilled point cannot land.
 *
 * `previouslySeededSlugs` comes from the seed lockfile. It is what turns a
 * silent orphaning of learner state into a build failure: if a slug that was
 * once seeded has vanished without a `mergedInto` redirect, every
 * `UserGrammarItem` keyed to it would be unreachable, and the point would just
 * stop appearing in the due queue with no error anywhere.
 */
export function validateGrammarContent({
  points,
  previouslySeededSlugs = [],
}: {
  points: GrammarContentFile
  previouslySeededSlugs?: string[]
}): GrammarValidationResult {
  const issues: GrammarValidationIssue[] = []
  const add = (rule: string, slug: string | null, message: string) =>
    issues.push({ message, rule, slug })

  const slugs = new Set<string>()
  const duplicates = new Set<string>()

  for (const point of points) {
    if (slugs.has(point.slug)) duplicates.add(point.slug)
    slugs.add(point.slug)
  }

  for (const slug of duplicates)
    add('unique-slug', slug, `Slug "${slug}" appears more than once.`)

  const liveSlugs = new Set(
    points.filter(point => !point.mergedInto).map(point => point.slug)
  )

  for (const point of points) {
    const { slug } = point

    if (!SLUG_PATTERN.test(slug ?? ''))
      add(
        'slug-format',
        slug ?? null,
        `Slug "${slug}" must be lowercase kebab-case.`
      )

    if (!point.title?.trim()) add('required-field', slug, 'Missing title.')

    if (!point.summary?.trim()) add('required-field', slug, 'Missing summary.')

    if (!has(GRAMMAR_FAMILIES, point.family))
      add('enum', slug, `Unknown family "${point.family}".`)

    if (!has(GRAMMAR_CEFR_LEVELS, point.cefrLevel))
      add('enum', slug, `Unknown cefrLevel "${point.cefrLevel}".`)

    if (!has(GRAMMAR_COMPLEXITY_LEVELS, point.complexity))
      add('enum', slug, `complexity must be 1-5, got "${point.complexity}".`)

    if (!has(GRAMMAR_L1_RISKS, point.l1Risk))
      add('enum', slug, `Unknown l1Risk "${point.l1Risk}".`)

    if (typeof point.order !== 'number' || !Number.isFinite(point.order))
      add('required-field', slug, 'Missing numeric order.')

    if (
      point.ieltsImpactOverride != null &&
      !has(GRAMMAR_IELTS_IMPACTS, point.ieltsImpactOverride)
    )
      add(
        'enum',
        slug,
        `Unknown ieltsImpactOverride "${point.ieltsImpactOverride}".`
      )

    for (const prerequisite of point.prerequisites ?? [])
      if (!liveSlugs.has(prerequisite))
        add(
          'prerequisite-resolves',
          slug,
          `prerequisites entry "${prerequisite}" does not resolve to a live point.`
        )

    for (const contrast of point.contrastsWith ?? [])
      if (contrast === slug)
        add('contrast-self', slug, 'contrastsWith points at itself.')
      else if (!liveSlugs.has(contrast))
        add(
          'contrast-resolves',
          slug,
          `contrastsWith entry "${contrast}" does not resolve to a live point.`
        )

    if (point.mergedInto && point.mergedInto === slug)
      add('merge-self', slug, 'mergedInto points at itself.')
    else if (point.mergedInto && !slugs.has(point.mergedInto))
      add(
        'merge-resolves',
        slug,
        `mergedInto target "${point.mergedInto}" does not exist.`
      )
    else if (point.mergedInto && !liveSlugs.has(point.mergedInto))
      add(
        'merge-chain',
        slug,
        `mergedInto target "${point.mergedInto}" is itself merged. Point at a live point so redirects never chain.`
      )

    validateBody({ add, point })
  }

  // The rule that converts silent data loss into a build failure.
  for (const seededSlug of previouslySeededSlugs)
    if (!slugs.has(seededSlug))
      add(
        'no-vanished-slug',
        seededSlug,
        `Slug "${seededSlug}" was seeded previously but is absent. Keep it as a stub with mergedInto, or learner progress on it is orphaned.`
      )

  return {
    checkedPoints: points.length,
    issues,
    ok: issues.length === 0,
  }
}

function validateBody({
  add,
  point,
}: {
  add: (rule: string, slug: string | null, message: string) => void
  point: GrammarContentFile[number]
}) {
  const { slug } = point
  const hasBody = Boolean(point.explanation?.trim())

  // A stub left behind by a merge carries no body and needs none.
  if (point.mergedInto) return

  if (!hasBody) return

  if (!has(GRAMMAR_REVIEW_STATUSES, point.reviewStatus))
    add(
      'review-status',
      slug,
      'A point with a body must carry a valid reviewStatus.'
    )

  if (
    requiresVietnameseExplanation({
      complexity: point.complexity as number,
      l1Risk: point.l1Risk as string,
    }) &&
    !point.explanationVi?.trim()
  )
    add(
      'vi-explanation-required',
      slug,
      'High l1Risk or complexity >= 4 requires explanationVi.'
    )

  /**
   * A sentence cannot be correct and incorrect in the same lesson.
   *
   * This is the one mechanically checkable half of the contrast-point problem:
   * generated content presented "She stopped to smoke." as a mistake on a point
   * whose own explanation says both forms are correct. If a sentence is listed
   * in `minimalPairs` it is being taught as correct, so it must not also appear
   * as the `wrong` side of a `commonMistakes` entry.
   */
  const minimalPairSentences = new Set(
    (point.minimalPairs ?? []).map(pair =>
      normalizeAnswerForComparison(pair.sentence)
    )
  )

  for (const mistake of point.commonMistakes ?? []) {
    const wrong = normalizeAnswerForComparison(mistake.wrong)

    if (wrong && minimalPairSentences.has(wrong))
      add(
        'mistake-contradicts-minimal-pair',
        slug,
        `"${mistake.wrong}" is listed as a correct minimal pair AND as a mistake. One of the two is wrong.`
      )
  }

  const drills = point.drills ?? []
  const required = getRequiredDrillCount(point.l1Risk as string)

  if (drills.length < required)
    add(
      'drill-minimum',
      slug,
      `Needs at least ${required} drills (l1Risk ${point.l1Risk}), has ${drills.length}.`
    )

  const kinds = new Set(drills.map(drill => drill.kind))

  if (drills.length > 0 && kinds.size < GRAMMAR_MIN_DISTINCT_DRILL_KINDS)
    add(
      'drill-kind-variety',
      slug,
      `Needs at least ${GRAMMAR_MIN_DISTINCT_DRILL_KINDS} distinct drill kinds, has ${kinds.size}.`
    )

  const drillIds = new Set<string>()

  for (const drill of drills) {
    if (!drill.id?.trim()) {
      add('drill-id', slug, 'A drill is missing an id.')
      continue
    }

    if (drillIds.has(drill.id))
      add('drill-id', slug, `Duplicate drill id "${drill.id}".`)

    drillIds.add(drill.id)

    if (!has(GRAMMAR_DRILL_KINDS, drill.kind))
      add('drill-kind', slug, `Drill "${drill.id}" has unknown kind.`)

    if (!drill.prompt?.trim())
      add('drill-field', slug, `Drill "${drill.id}" is missing a prompt.`)

    if (!drill.target?.trim())
      add('drill-field', slug, `Drill "${drill.id}" is missing a target.`)

    if (!drill.explanation?.trim())
      add('drill-field', slug, `Drill "${drill.id}" is missing an explanation.`)

    if (drill.kind === 'choice' && (drill.choices?.length ?? 0) < 2)
      add(
        'drill-choices',
        slug,
        `Choice drill "${drill.id}" needs at least 2 choices.`
      )

    const answerSet = distinctAnswerSet(drill.acceptedAnswers)
    const distinctAnswers = answerSet.size
    const normalizedTarget = normalizeAnswerForComparison(drill.target)

    if (has(GRAMMAR_PRODUCTION_DRILL_KINDS, drill.kind) && distinctAnswers === 0)
      add(
        'accepted-answers',
        slug,
        `Production drill "${drill.id}" has no acceptedAnswers.`
      )

    /**
     * The target must be gradeable. A drill whose `target` is absent from
     * `acceptedAnswers` marks the learner wrong for typing the very answer the
     * reveal panel shows them - the worst possible outcome, because it reads as
     * a bug in their own understanding.
     */
    if (normalizedTarget && distinctAnswers > 0 && !answerSet.has(normalizedTarget))
      add(
        'accepted-answers',
        slug,
        `Drill "${drill.id}" target "${drill.target}" is not in acceptedAnswers, so the correct answer would be graded wrong.`
      )

    /**
     * A choice drill that accepts a distractor accepts everything.
     *
     * Generated content hit this: a three-option drill listed all three options
     * as accepted, so any click scored correct and the item taught nothing. It
     * passed every other rule, including the minimum-distinct-answers rule,
     * which is exactly why it needs its own check.
     */
    if (drill.kind === 'choice') {
      const normalizedChoices = (drill.choices ?? []).map(
        normalizeAnswerForComparison
      )

      /**
       * The correct answer must be on the menu. Generated content produced a
       * three-option drill whose target appeared in none of them, which is
       * unanswerable: every click is marked wrong and the learner concludes
       * they do not understand a rule they may understand perfectly.
       */
      if (
        normalizedTarget &&
        normalizedChoices.length > 0 &&
        !normalizedChoices.includes(normalizedTarget)
      )
        add(
          'drill-choices',
          slug,
          `Choice drill "${drill.id}" target "${drill.target}" is not among its choices, so no option can be correct.`
        )

      for (const choice of drill.choices ?? []) {
        const normalizedChoice = normalizeAnswerForComparison(choice)

        if (
          normalizedChoice &&
          normalizedChoice !== normalizedTarget &&
          answerSet.has(normalizedChoice)
        )
          add(
            'drill-choices',
            slug,
            `Choice drill "${drill.id}" accepts distractor "${choice}" as a correct answer, so every option scores correct.`
          )
      }
    }
  }
}

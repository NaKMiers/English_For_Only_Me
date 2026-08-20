export const GRAMMAR_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export const GRAMMAR_COMPLEXITY_LEVELS = [1, 2, 3, 4, 5] as const

export const GRAMMAR_L1_RISKS = ['low', 'medium', 'high'] as const

/**
 * Numeric rank for sorting by L1 risk.
 *
 * Required because `l1Risk` is a string enum, and Mongo sorts strings
 * lexicographically: a descending sort on the raw field yields
 * medium > low > high, putting the HIGHEST-risk points last. That silently
 * inverted the browse order the two-axis taxonomy exists to produce. Sorting on
 * a stored rank is the fix; the enum stays for readability.
 */
export const GRAMMAR_L1_RISK_RANK: Record<
  (typeof GRAMMAR_L1_RISKS)[number],
  number
> = {
  high: 3,
  low: 1,
  medium: 2,
}

export const GRAMMAR_IELTS_IMPACTS = ['low', 'medium', 'high'] as const

export const GRAMMAR_FAMILIES = [
  'verb-tenses',
  'modals',
  'conditionals',
  'passive',
  'articles-determiners',
  'nouns-quantifiers',
  'pronouns',
  'adjectives-adverbs',
  'comparatives',
  'prepositions',
  'relative-clauses',
  'reported-speech',
  'questions-negation',
  'infinitives-gerunds',
  'word-order-inversion',
  'discourse-connectors',
  'phrasal-verbs',
] as const

export const GRAMMAR_FAMILY_LABELS: Record<
  (typeof GRAMMAR_FAMILIES)[number],
  string
> = {
  'adjectives-adverbs': 'Adjectives & Adverbs',
  'articles-determiners': 'Articles & Determiners',
  comparatives: 'Comparatives',
  conditionals: 'Conditionals',
  'discourse-connectors': 'Discourse Connectors',
  'infinitives-gerunds': 'Infinitives & Gerunds',
  modals: 'Modals',
  'nouns-quantifiers': 'Nouns & Quantifiers',
  passive: 'Passive',
  'phrasal-verbs': 'Phrasal Verbs',
  prepositions: 'Prepositions',
  pronouns: 'Pronouns',
  'questions-negation': 'Questions & Negation',
  'relative-clauses': 'Relative Clauses',
  'reported-speech': 'Reported Speech',
  'verb-tenses': 'Verb Tenses',
  'word-order-inversion': 'Word Order & Inversion',
}

export const GRAMMAR_DRILL_KINDS = [
  'choice',
  'fillBlank',
  'transform',
  'correct',
  'build',
] as const

/**
 * Drill kinds where the learner produces free text rather than selecting.
 * These are graded through `buildDictationCorrection` against `acceptedAnswers`
 * and are therefore the kinds that require an accepted-answer list.
 */
export const GRAMMAR_PRODUCTION_DRILL_KINDS = [
  'transform',
  'correct',
  'build',
] as const

export const GRAMMAR_REVIEW_STATUSES = ['unverified', 'reviewed'] as const

export const GRAMMAR_USER_ITEM_STATUSES = [
  'learning',
  'alreadyKnow',
  'mastered',
  'ignored',
] as const

export const GRAMMAR_DRILL_VERDICTS = ['correct', 'wrong', 'revealed'] as const

export const GRAMMAR_RECALL_DEFAULT_LIMIT = 12
export const GRAMMAR_RECALL_MAX_LIMIT = 60

export const GRAMMAR_DIAGNOSTIC_DEFAULT_LIMIT = 40
export const GRAMMAR_DIAGNOSTIC_MAX_LIMIT = 80

/**
 * How the placement diagnostic spends its questions across L1-transfer risk.
 *
 * A generic placement test spreads evenly across CEFR levels, which burns most
 * of its questions confirming things a Vietnamese speaker was never likely to
 * get wrong. Weighting toward high `l1Risk` spends them where the answer is
 * genuinely uncertain, so the same question count yields more information.
 */
export const GRAMMAR_DIAGNOSTIC_RISK_WEIGHTS: Record<
  'high' | 'medium' | 'low',
  number
> = {
  high: 0.5,
  low: 0.15,
  medium: 0.35,
}

/**
 * Ladder stage seeded by a CORRECT diagnostic answer.
 *
 * Deliberately mid-ladder rather than "already known". One right answer is
 * evidence, not proof - it could be a lucky guess on a multiple choice. Seeding
 * at stage 3 means the point comes back in a few days instead of tomorrow, and
 * getting it wrong then drops it straight back to stage 1. A binary
 * known/unknown verdict would throw that nuance away.
 */
export const GRAMMAR_DIAGNOSTIC_CORRECT_STAGE = 3

/** Days of history the streak and activity chart look back over. */
export const GRAMMAR_STATS_TREND_DAYS = 14

/**
 * Validator thresholds (eng review D14).
 *
 * The recall ladder has 7 rungs, so a point with fewer drills than rungs
 * repeats an item before the learner has mastered the rule - which tests memory
 * of the sentence rather than understanding of the grammar. Eight is therefore
 * the floor. High-`l1Risk` points get twelve because those are the points a
 * Vietnamese L1 learner resets to stage 1 on repeatedly, so they need more
 * material to cycle through.
 */
export const GRAMMAR_MIN_DRILLS_PER_POINT = 8
export const GRAMMAR_MIN_DRILLS_HIGH_L1_RISK = 12
export const GRAMMAR_MIN_DISTINCT_DRILL_KINDS = 3

/**
 * There is deliberately NO minimum on `acceptedAnswers`.
 *
 * The original plan required three distinct accepted answers per production
 * drill, to stop the grader marking a valid alternative wrong. Measured against
 * real generated content, the rule backfired at every threshold:
 *
 * - at three, the author padded the list with the same answer repeated;
 * - at two, it padded with UNGRAMMATICAL variants - "Please close door." was
 *   listed as an accepted answer to a drill about the definite article, so the
 *   learner would be scored correct for making exactly the mistake the lesson
 *   teaches against.
 *
 * A quota on "valid alternatives" cannot be met by finding more valid
 * alternatives when none exist, only by inventing them, and an invented
 * alternative is wrong by construction. Accepting a wrong answer is a worse
 * failure than rejecting a right one, because the learner never finds out.
 *
 * So the rules that remain are ones fabrication cannot satisfy: the target must
 * be in `acceptedAnswers`, and a distractor must not be. The long tail of valid
 * phrasings is handled at runtime by the "my answer was also correct" escape
 * hatch, where the learner has a real sentence in front of them.
 */

/**
 * Families whose points cap a learner's IELTS band through *range* rather than
 * accuracy. Used by the derived `ieltsImpact` value (eng review D13): an
 * examiner rewards a variety of complex structures, and these are the families
 * that supply them.
 */
export const GRAMMAR_RANGE_FAMILIES = [
  'relative-clauses',
  'conditionals',
  'word-order-inversion',
  'passive',
] as const

export const GRAMMAR_HIGH_IELTS_IMPACT_MIN_COMPLEXITY = 4

/**
 * Vietnamese explanation is generated only where difficulty is highest
 * (eng review D12). Generating every lesson twice would double the review
 * burden on 180 AI-written lessons, which is the risk most likely to leave the
 * module unfinished.
 */
export const GRAMMAR_VI_EXPLANATION_MIN_COMPLEXITY = 4

export const GRAMMAR_POINTS_DEFAULT_LIMIT = 40
export const GRAMMAR_POINTS_MAX_LIMIT = 200

export const GRAMMAR_SEED_SOURCE = 'taxonomy.json'

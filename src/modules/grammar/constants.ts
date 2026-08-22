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

/**
 * Which flow produced a drill attempt.
 *
 * Exists so the correct-answer streak can exclude assessment runs: 40 questions
 * answered from a cold start are not a ten-answer run of mastery, and counting
 * them would hand out the module's only compliment for guessing well once.
 *
 * `'diagnostic'` is RETIRED - the placement test it belonged to was removed
 * with the on-demand test. The member stays because real attempt rows in Mongo
 * carry it, and dropping an enum member that exists in stored data turns every
 * historical read into a validation error. Nothing writes it any more.
 *
 * `'test'` is its successor: the learner-initiated test, launchable any time.
 */
export const GRAMMAR_ATTEMPT_ORIGINS = ['recall', 'diagnostic', 'test'] as const

/**
 * How far back the correct-answer streak looks.
 *
 * Bounded rather than unbounded: the streak is a motivational number, and any
 * run longer than this is already past every threshold that reads it. Also the
 * reason this is a separate query from the stats trend read, which projects only
 * `at` inside a 14-day window and so cannot see verdicts or older streaks.
 */
export const GRAMMAR_STREAK_LOOKBACK_ATTEMPTS = 50

export const GRAMMAR_RECALL_DEFAULT_LIMIT = 12
export const GRAMMAR_RECALL_MAX_LIMIT = 60

/**
 * How many questions an on-demand test may ask.
 *
 * The ceiling is not arbitrary. Generation is chunked into
 * `GRAMMAR_TEST_GENERATION_CHUNK`-sized OpenAI calls, so 40 is four concurrent
 * requests - enough to be worth chunking, few enough that a slow provider does
 * not leave the learner staring at a spinner.
 */
export const GRAMMAR_TEST_QUESTION_COUNTS = [5, 10, 20, 40] as const
export const GRAMMAR_TEST_DEFAULT_QUESTIONS = 10
export const GRAMMAR_TEST_MAX_QUESTIONS = 40

/**
 * Which points a test is allowed to draw from.
 *
 * `learning` and `due` are the study scopes; `untouched` is what absorbed the
 * removed placement diagnostic; `mastered` is the one that makes the test
 * falsifiable - it lets the learner check a claim the ladder has already
 * accepted. `ignored` is deliberately NOT a scope and is excluded from all of
 * them: it means "stop showing me this", and a test answer must not override an
 * instruction.
 */
export const GRAMMAR_TEST_SCOPES = [
  'all',
  'learning',
  'due',
  'untouched',
  'mastered',
] as const

/**
 * Points per OpenAI call.
 *
 * One request for 40 questions runs straight into the failure named at
 * `lib/ai/openAiClientCore.ts:11` - reasoning tokens count against
 * `max_output_tokens`, and an under-budgeted response comes back `incomplete`,
 * unusable, AND billed. Chunking converts one all-or-nothing request into
 * several independent ones: a failed chunk costs ten generated questions,
 * backfilled from stored drills, instead of the whole test.
 */
export const GRAMMAR_TEST_GENERATION_CHUNK = 10

/** Output-token budget per generated question, with reasoning headroom. */
export const GRAMMAR_TEST_TOKENS_PER_QUESTION = 320

/**
 * Cost guards on a route that spends money per call.
 *
 * The cooldown does double duty: it stops a runaway retry loop from billing all
 * night, and it makes a double-clicked Start return the session it already
 * created rather than generating a second one.
 */
export const GRAMMAR_TEST_COOLDOWN_MS = 60_000
export const GRAMMAR_TEST_DAILY_LIMIT = 20

/**
 * How long an unsubmitted test survives.
 *
 * Long enough that a test abandoned before a meeting is still there afterwards;
 * short enough that the collection does not accumulate every session the
 * learner ever walked away from.
 */
export const GRAMMAR_TEST_SESSION_TTL_SECONDS = 86_400

/**
 * Generated drills kept per point, newest first.
 *
 * The drill subdocument was sized for 8-12 entries at roughly 15KB per point
 * (see `GrammarPointModel.ts`). A test appends one generated drill per point it
 * touches, so without a cap a favourite family accumulates one per test
 * forever. Eight matches `GRAMMAR_MIN_DRILLS_PER_POINT`: enough that the export
 * pass has real material to promote, bounded enough that the document stays the
 * size it was designed to be.
 */
export const GRAMMAR_MAX_GENERATED_DRILLS = 8

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

/**
 * How the grammar map can be narrowed by the learner's own progress.
 *
 * Distinct from `GRAMMAR_USER_ITEM_STATUSES`, which is what a point's row can
 * hold. These are browse intents, and two of them are not statuses at all:
 * `notStarted` means the absence of a row, and `due` is a status plus a date.
 * Collapsing the two enums would make "show me what is waiting" unexpressible.
 */
export const GRAMMAR_STUDY_FILTERS = [
  'notStarted',
  'learning',
  'due',
  'mastered',
  'alreadyKnow',
  'ignored',
] as const

export const GRAMMAR_STUDY_FILTER_LABELS: Record<
  (typeof GRAMMAR_STUDY_FILTERS)[number],
  string
> = {
  alreadyKnow: 'Already known',
  due: 'Due now',
  ignored: 'Skipped',
  learning: 'Learning',
  mastered: 'Mastered',
  notStarted: 'Not started',
}

export const GRAMMAR_SEED_SOURCE = 'taxonomy.json'

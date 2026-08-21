import type { GrammarComplexity, GrammarL1Risk } from '@/modules/grammar/types'

/**
 * Every line the sensei can say, authored.
 *
 * No model at runtime, on purpose. Deadpan only works if it is instant and
 * identical every time - a line that takes a second to arrive, or that varies
 * in register between visits, reads as a chatbot rather than as a character.
 * Selection is thresholds over stored fields; see `selectSenseiLine`.
 *
 * The register: brutal, never cruel. Never jokes, never cheers, never uses an
 * exclamation mark. Praise is withheld rather than given - "Hm." is the highest
 * compliment available, and it has to stay that way to mean anything.
 */

/** Consecutive correct answers that earn the one available compliment. */
export const SENSEI_STREAK_THRESHOLD = 10

/** Wrong answers past which the point counts as high-friction for this learner. */
export const SENSEI_HIGH_FRICTION_WRONG_COUNT = 5

/** Days after which a point counts as going cold. */
export const SENSEI_STALE_DAYS = 21

export const SENSEI_LINES = {
  /** Stage went backwards. Outranks everything: it is the most useful signal. */
  regression: 'It came back. They always come back.',

  /** Terminal register: the learner has closed this point out. */
  mastered:
    'This one is finished. Do not mistake that for knowing the language.',
  alreadyKnow: 'You said you knew this. I have written it down.',

  /** The only compliment in the table. */
  streak: 'Hm.',

  /** Wrong many times. Names the count, does not soften it. */
  highFriction: (wrongCount: number) =>
    `You have answered this wrong ${wrongCount} times. Sit down.`,

  /** Gone cold. */
  stale: (days: number) =>
    `${days} days since you looked at this. It has not improved on its own.`,

  /** Never touched. */
  untouched: 'You have not tried this one. That is its own kind of answer.',

  /**
   * The default, keyed by how hard the point is. Reached when nothing more
   * specific applies, which on a first visit is most points.
   */
  default: {
    high: 'This is one of the ones that beats you. Not because it is advanced. Because your first language does not have it.',
    medium: 'Ordinary difficulty. Ordinary attention, then.',
    low: 'Easy. Which is why getting it wrong is worse.',
  } satisfies Record<GrammarL1Risk, string>,

  /**
   * Replaced the red unverified banner. Says the same thing in the page's own
   * voice - the banner was honest and looked like a defect notice, and honesty
   * that gets ignored is not doing its job. The warning still carries
   * `role="status"` where it renders, so nothing was lost accessibly.
   */
  unverified:
    'This lesson was written by a machine. I have not read it. Neither have you. Be careful.',

  /** The learner overrode the grader and was right. */
  graderOverridden: '...Fine. That is also correct.',

  /** Drill outcomes. */
  correct: '...Correct.',
  wrong: 'No. Read it again.',
  revealed: 'You looked. I will not pretend that counts.',

  /** Error Archive empty states. Absence is the common case on a first visit. */
  empty: {
    firstWrong: 'No record. Either you know this or you have been avoiding it.',
    worstTrap: 'No pattern yet. Give it time.',
    conquered: 'Nothing to show. You have not beaten it.',
    revivals: 'It has not come back. Yet.',
  },
} as const

/**
 * The hook line: the uncomfortable truth, stated as two numbers and a verdict.
 *
 * "A1. Difficulty 5." is the whole argument for the two-axis taxonomy in six
 * characters - the point a learner meets on day one is the hardest one in the
 * curriculum, and no CEFR-ordered course will ever tell them that.
 */
export function senseiHookLine({
  cefrLevel,
  complexity,
  l1Risk,
}: {
  cefrLevel: string
  complexity: GrammarComplexity
  l1Risk: GrammarL1Risk
}) {
  const risk =
    l1Risk === 'high'
      ? 'High interference.'
      : l1Risk === 'medium'
        ? 'Some interference.'
        : 'Low interference.'

  return `${cefrLevel}. Difficulty ${complexity}. ${risk}`
}

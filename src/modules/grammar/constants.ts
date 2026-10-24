/** First-try accuracy for three and two stars. Finishing always earns one. */
export const THREE_STAR_ACCURACY = 0.95
export const TWO_STAR_ACCURACY = 0.8

/** Accuracy that passes a checkpoint, a test-out, or a review. */
export const PASS_ACCURACY = 0.8

export const CHECKPOINT_SIZE = 12
export const REVIEW_MIN_SIZE = 6
export const REVIEW_MAX_SIZE = 8
export const WEAK_MAX_SIZE = 12

export const LESSONS_PER_UNIT = 5

export const GRAMMAR_SESSION_MODES = [
  'lesson',
  'review',
  'checkpoint',
  'weak',
] as const

export type GrammarSessionMode = (typeof GRAMMAR_SESSION_MODES)[number]

export const GRAMMAR_SESSIONS_URL = '/api/grammar/sessions'

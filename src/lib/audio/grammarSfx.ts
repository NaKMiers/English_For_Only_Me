import type { ZzfxParams } from './zzfx'

/**
 * The whole sound vocabulary: four stings, no music, no voice.
 *
 * Four because that is how many distinct events the learner needs to hear -
 * hit, miss, revive, page turn - and every one beyond that turns feedback into
 * a slot machine. They are also short and dry on purpose: a sound that draws
 * attention to itself gets muted on the second session.
 */
export const GRAMMAR_STINGS = {
  /** A hit landed. Bright, short, over immediately. */
  correct: {
    attack: 0.005,
    decay: 0.04,
    frequency: 660,
    release: 0.08,
    shape: 0,
    slide: 900,
    sustain: 0.02,
    volume: 0.22,
  },
  /** Page turn. Barely a sound; it exists so navigation feels physical. */
  pageTurn: {
    attack: 0.004,
    decay: 0.03,
    frequency: 200,
    release: 0.06,
    shape: 2,
    slide: 140,
    sustain: 0.01,
    volume: 0.1,
  },
  /** It came back. Rising, uneasy. */
  revive: {
    attack: 0.02,
    decay: 0.06,
    frequency: 180,
    release: 0.24,
    shape: 3,
    slide: 260,
    sustain: 0.08,
    volume: 0.2,
  },
  /** A miss. Low and flat - not a buzzer, and not comic. */
  wrong: {
    attack: 0.005,
    decay: 0.05,
    frequency: 150,
    release: 0.12,
    shape: 1,
    slide: -60,
    sustain: 0.03,
    volume: 0.16,
  },
} satisfies Record<string, ZzfxParams>

export type GrammarSting = keyof typeof GRAMMAR_STINGS

export const GRAMMAR_SFX_STORAGE_KEY = 'efom-grammar-sfx'

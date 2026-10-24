import type { ZzfxParams } from './zzfx'

/**
 * The whole sound vocabulary for lesson players: four stings, no music, no
 * voice.
 *
 * Four because that is how many distinct events the learner needs to hear -
 * right, wrong, a combo milestone, a finished lesson - and every one beyond
 * that turns feedback into a slot machine. Each sting is a short run of notes
 * (`delay` staggers them): rising means good, falling means try again. All of
 * them are over in well under half a second, so they never talk over the next
 * card.
 */
export const LESSON_STINGS = {
  /** A right answer. Two bright rising notes: "ting-ting". */
  correct: [
    {
      attack: 0.004,
      decay: 0.04,
      frequency: 784,
      release: 0.1,
      sustain: 0.02,
      volume: 0.24,
    },
    {
      attack: 0.004,
      decay: 0.05,
      delay: 0.08,
      frequency: 1047,
      release: 0.18,
      sustain: 0.03,
      volume: 0.24,
    },
  ],
  /** A finished lesson. A four-note rising arpeggio. */
  complete: [523, 659, 784, 1047].map((frequency, index) => ({
    attack: 0.006,
    decay: 0.05,
    delay: index * 0.1,
    frequency,
    release: index === 3 ? 0.4 : 0.12,
    shape: 2 as const,
    sustain: index === 3 ? 0.12 : 0.03,
    volume: 0.26,
  })) satisfies ZzfxParams[],
  /** A combo milestone. Three quick rising notes, brighter than `correct`. */
  combo: [659, 880, 1319].map((frequency, index) => ({
    attack: 0.004,
    decay: 0.04,
    delay: index * 0.06,
    frequency,
    release: index === 2 ? 0.24 : 0.08,
    sustain: 0.02,
    volume: 0.22,
  })) satisfies ZzfxParams[],
  /** A wrong answer. Two low falling notes - not a buzzer, and not comic. */
  wrong: [
    {
      attack: 0.006,
      decay: 0.05,
      frequency: 247,
      release: 0.08,
      shape: 2,
      sustain: 0.03,
      volume: 0.3,
    },
    {
      attack: 0.006,
      decay: 0.06,
      delay: 0.11,
      frequency: 185,
      release: 0.16,
      shape: 2,
      slide: -40,
      sustain: 0.04,
      volume: 0.3,
    },
  ],
} satisfies Record<string, ZzfxParams[]>

export type LessonSting = keyof typeof LESSON_STINGS

// The key predates the rename; keeping it keeps the learner's saved choice.
export const LESSON_SFX_STORAGE_KEY = 'efom-grammar-sfx'

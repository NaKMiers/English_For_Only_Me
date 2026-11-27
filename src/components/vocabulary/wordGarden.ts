/**
 * The vocabulary journey as a garden that grows with the words the learner
 * knows. Each stage is tied to a rough CEFR vocabulary size (lemma counts
 * from common estimates); they are a guide for motivation, not a test.
 */
export const WORD_STAGES = [
  { at: 0, key: 'seed', level: null },
  { at: 500, key: 'sprout', level: 'A1' },
  { at: 1500, key: 'sapling', level: 'A2' },
  { at: 2500, key: 'youngTree', level: 'B1' },
  { at: 3250, key: 'tree', level: 'B2' },
  { at: 4000, key: 'grove', level: 'C1' },
  { at: 5000, key: 'forest', level: 'C2' },
] as const

export type WordStageKey = (typeof WORD_STAGES)[number]['key']

export interface WordGardenPosition {
  /** Index into WORD_STAGES of the stage reached. */
  index: number
  /** Words still to go to the next stage, or 0 at the last one. */
  left: number
  /** Share of the way from this stage to the next, 0 to 1 (1 at the end). */
  progress: number
}

/** Where the learner's garden stands for a number of known words. */
export function wordGardenPosition(known: number): WordGardenPosition {
  const words = Math.max(0, Math.floor(known))
  let index = 0

  for (const [position, stage] of WORD_STAGES.entries())
    if (words >= stage.at) index = position

  const current = WORD_STAGES[index]
  const next = WORD_STAGES[index + 1]

  if (!next) return { index, left: 0, progress: 1 }

  return {
    index,
    left: next.at - words,
    progress: (words - current.at) / (next.at - current.at),
  }
}

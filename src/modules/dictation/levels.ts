/**
 * CEFR levels, lowest to highest. Order is significant — it drives the derived
 * "level range" shown on topic cards (e.g. "A1–C1").
 */
export const DICTATION_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type DictationLevel = (typeof DICTATION_LEVELS)[number]

export function isDictationLevel(value: unknown): value is DictationLevel {
  return (
    typeof value === 'string' &&
    (DICTATION_LEVELS as readonly string[]).includes(value)
  )
}

/**
 * Format a set of per-video levels into a topic-card range string:
 * one level -> "B1"; a span -> "A1–C1" (en dash); none -> null.
 */
export function formatLevelRange(
  levels: ReadonlyArray<DictationLevel | null | undefined>
): string | null {
  const present = levels.filter(isDictationLevel)

  if (present.length === 0) return null

  let minIndex = DICTATION_LEVELS.length - 1
  let maxIndex = 0

  for (const level of present) {
    const index = DICTATION_LEVELS.indexOf(level)
    if (index < minIndex) minIndex = index
    if (index > maxIndex) maxIndex = index
  }

  const min = DICTATION_LEVELS[minIndex]
  const max = DICTATION_LEVELS[maxIndex]

  return min === max ? min : `${min}–${max}`
}

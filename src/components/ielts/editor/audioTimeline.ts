/** "m:ss" for a position in seconds (never negative, never NaN). */
export function formatClock(seconds: number) {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0

  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Index of the script line playing at `time`: the last line whose offset has
 * passed. -1 before the first line or when the audio has no line timings.
 */
export function lineIndexAt(offsets: number[], time: number) {
  let index = -1

  for (let i = 0; i < offsets.length; i += 1) {
    if (offsets[i] > time) break
    index = i
  }

  return index
}

/**
 * Where the previous/next line button should seek. "Previous" restarts the
 * current line when more than a second into it, like a music player.
 */
export function lineSeekTarget(
  offsets: number[],
  time: number,
  direction: -1 | 1
) {
  if (!offsets.length) return null

  const current = lineIndexAt(offsets, time)

  if (direction === 1) return offsets[current + 1] ?? null
  if (current >= 0 && time - offsets[current] > 1) return offsets[current]

  return offsets[Math.max(0, current - 1)]
}

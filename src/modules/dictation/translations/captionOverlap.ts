export interface CaptionCue {
  text: string
  startMs: number | null
  endMs: number | null
}

/**
 * Resolve the translated caption for a sentence's time window by picking every
 * cue in a language track that overlaps [startMs, endMs) and joining their text
 * in order. This is how a foreign caption file becomes the "translation" for an
 * English segment: pure time overlap, no sentence alignment needed.
 *
 * Returns '' when the window is untimed (nothing to align against) or when no
 * cue overlaps it.
 */
export function resolveCaptionForWindow(
  cues: CaptionCue[],
  startMs: number | null,
  endMs: number | null
): string {
  if (startMs === null || endMs === null) return ''

  const overlapping = cues
    .filter(
      cue =>
        cue.startMs !== null &&
        cue.endMs !== null &&
        cue.startMs < endMs &&
        cue.endMs > startMs
    )
    .sort((left, right) => (left.startMs ?? 0) - (right.startMs ?? 0))

  const seen = new Set<string>()
  const parts: string[] = []

  for (const cue of overlapping) {
    const text = cue.text.trim()

    // Caption tracks often repeat a line across adjacent cues; collapse dupes so
    // a two-cue overlap doesn't show the same sentence twice.
    if (!text || seen.has(text)) continue

    seen.add(text)
    parts.push(text)
  }

  return parts.join(' ')
}

import { resolveCaptionForWindow, type CaptionCue } from './captionOverlap'

/**
 * The translation to show for a segment in a language: the admin's manual
 * override when set, otherwise the time-overlapped caption from the uploaded
 * SRT/VTT. Shared by practice and the admin preview/editor so an edit shows up
 * everywhere.
 */
export function resolveSegmentTranslation({
  cues,
  language,
  segment,
}: {
  cues: CaptionCue[]
  language: string
  segment: {
    endMs: number | null
    startMs: number | null
    translations?: Record<string, string>
  }
}): string {
  const override = segment.translations?.[language]?.trim()

  if (override) return override

  return resolveCaptionForWindow(cues, segment.startMs, segment.endMs)
}

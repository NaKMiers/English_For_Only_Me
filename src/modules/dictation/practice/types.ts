import type { SegmentProgress } from '@/modules/dictation/practice/segmentProgress'
import type { CaptionCue } from '@/modules/dictation/translations/captionOverlap'

/**
 * The slice of a segment the practice page actually needs in the browser:
 * content for typing and replay, plus the learner's own progress overlay.
 * Admin fields (normalizedText, quality flags, source hash, dates) and other
 * languages' translation overrides stay on the server.
 */
export interface DictationPracticeSegmentContent {
  endMs: number | null
  hints: string[]
  hintsOverridden: boolean
  id: string
  order: number
  startMs: number | null
  text: string
  transcriptId: string
  videoId: string
}

export type DictationPracticeSegment = DictationPracticeSegmentContent &
  SegmentProgress

/**
 * One translation language for practice: the uploaded caption cues plus the
 * admin's per-segment overrides (segmentId -> text) for that language only.
 */
export interface PracticeTranslationTrack {
  cues: CaptionCue[]
  language: string
  overrides: Record<string, string>
}

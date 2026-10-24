import {
  pickSegmentTranslationOverrides,
  toDictationPracticeSegmentContent,
} from '@/modules/dictation/services/dictationSegmentRecords'
import type { CaptionCue } from '@/modules/dictation/translations/captionOverlap'

import {
  overlaySegmentProgress,
  type SegmentProgressRow,
} from './segmentProgress'
import type {
  DictationPracticeSegment,
  PracticeTranslationTrack,
} from './types'

type SegmentDocument = Parameters<
  typeof toDictationPracticeSegmentContent
>[0] & {
  translations?: unknown
}

/**
 * The segments the practice page hands to the browser: content fields only,
 * with the learner's own progress overlaid. Progress fields on the shared
 * segment document are dropped by the content mapper before the overlay runs,
 * so they can never leak from one learner to another.
 */
export function buildPracticeSegments(
  segments: SegmentDocument[],
  progressRows: SegmentProgressRow[]
): DictationPracticeSegment[] {
  return overlaySegmentProgress(
    segments.map(toDictationPracticeSegmentContent),
    progressRows
  )
}

/** The opening translation track, with only that language's overrides. */
export function buildInitialTranslationTrack(
  segments: SegmentDocument[],
  firstTrack: { cues: CaptionCue[]; language: string } | null
): PracticeTranslationTrack | null {
  if (!firstTrack) return null

  return {
    cues: firstTrack.cues,
    language: firstTrack.language,
    overrides: pickSegmentTranslationOverrides(segments, firstTrack.language),
  }
}

import type { DictationSegmentRecord } from '@/models/dictation/DictationSegmentModel'
import type { DictationPracticeSegmentContent } from '@/modules/dictation/practice/types'
import type { DictationSegmentQualityFlag } from '@/modules/dictation/types'

const segmentQualityFlags = new Set<DictationSegmentQualityFlag>([
  'tooLong',
  'tooShort',
  'untimed',
  'partialTiming',
  'missingPunctuation',
  'likelyNonEnglish',
  'overlappingTiming',
  'largeGap',
  'duplicateText',
])

function isSegmentQualityFlag(
  value: string
): value is DictationSegmentQualityFlag {
  return segmentQualityFlags.has(value as DictationSegmentQualityFlag)
}

/** Segment translations come back as a Mongoose Map (toObject) or a plain object
 * (lean), depending on the read. Normalize both to a plain string record and
 * drop empty values. */
export function normalizeTranslations(value: unknown): Record<string, string> {
  if (!value) return {}

  const entries =
    value instanceof Map
      ? Array.from(value.entries())
      : Object.entries(value as Record<string, unknown>)
  const result: Record<string, string> = {}

  for (const [key, raw] of entries)
    if (typeof raw === 'string' && raw.trim().length > 0) result[key] = raw

  return result
}

export function toDictationSegmentRecord(segment: {
  _id: unknown
  attemptCount?: number
  attemptStatus?: DictationSegmentRecord['attemptStatus']
  createdAt: Date
  cueIndexes?: number[]
  endMs?: number | null
  hints?: string[]
  hintsOverridden?: boolean
  lastAttemptAt?: Date | null
  normalizedText: string
  order: number
  qualityFlags?: string[]
  startMs?: number | null
  text: string
  transcriptId: unknown
  transcriptSourceHash: string
  translations?: unknown
  updatedAt: Date
  videoId: unknown
  warningAccepted?: boolean
}): DictationSegmentRecord {
  return {
    id: String(segment._id),
    attemptCount: segment.attemptCount ?? 0,
    attemptStatus: segment.attemptStatus ?? 'notStarted',
    createdAt: segment.createdAt,
    cueIndexes: segment.cueIndexes ?? [],
    endMs: segment.endMs ?? null,
    hints: segment.hints ?? [],
    hintsOverridden: segment.hintsOverridden ?? false,
    lastAttemptAt: segment.lastAttemptAt ?? null,
    normalizedText: segment.normalizedText,
    order: segment.order,
    qualityFlags: (segment.qualityFlags ?? []).filter(isSegmentQualityFlag),
    startMs: segment.startMs ?? null,
    text: segment.text,
    transcriptId: String(segment.transcriptId),
    transcriptSourceHash: segment.transcriptSourceHash,
    translations: normalizeTranslations(segment.translations),
    updatedAt: segment.updatedAt,
    videoId: String(segment.videoId),
    warningAccepted: segment.warningAccepted ?? false,
  }
}

/** Fields the practice page loads, so the query projects to what it sends. */
export const PRACTICE_SEGMENT_FIELDS =
  'videoId transcriptId order text startMs endMs hints hintsOverridden translations'

export function toDictationPracticeSegmentContent(segment: {
  _id: unknown
  endMs?: number | null
  hints?: string[]
  hintsOverridden?: boolean
  order: number
  startMs?: number | null
  text: string
  transcriptId: unknown
  videoId: unknown
}): DictationPracticeSegmentContent {
  const hintsOverridden = segment.hintsOverridden ?? false

  return {
    endMs: segment.endMs ?? null,
    // Hints only render when the admin overrode them; the rest are derived
    // in the browser, so there is nothing to send.
    hints: hintsOverridden ? (segment.hints ?? []) : [],
    hintsOverridden,
    id: String(segment._id),
    order: segment.order,
    startMs: segment.startMs ?? null,
    text: segment.text,
    transcriptId: String(segment.transcriptId),
    videoId: String(segment.videoId),
  }
}

/** One language's per-segment overrides (segmentId -> text), empty ones dropped. */
export function pickSegmentTranslationOverrides(
  segments: Array<{ _id: unknown; translations?: unknown }>,
  language: string
): Record<string, string> {
  const overrides: Record<string, string> = {}

  if (!language) return overrides

  for (const segment of segments) {
    const value = normalizeTranslations(segment.translations)[language]

    if (value) overrides[String(segment._id)] = value
  }

  return overrides
}

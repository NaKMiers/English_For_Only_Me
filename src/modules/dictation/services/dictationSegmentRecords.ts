import type { DictationSegmentRecord } from '@/models/dictation/DictationSegmentModel'
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
function normalizeTranslations(value: unknown): Record<string, string> {
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

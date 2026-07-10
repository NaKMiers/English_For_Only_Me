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

export function toDictationSegmentRecord(segment: {
  _id: unknown
  attemptCount?: number
  attemptStatus?: DictationSegmentRecord['attemptStatus']
  createdAt: Date
  cueIndexes?: number[]
  endMs?: number | null
  lastAttemptAt?: Date | null
  normalizedText: string
  order: number
  qualityFlags?: string[]
  startMs?: number | null
  text: string
  transcriptId: unknown
  transcriptSourceHash: string
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
    lastAttemptAt: segment.lastAttemptAt ?? null,
    normalizedText: segment.normalizedText,
    order: segment.order,
    qualityFlags: (segment.qualityFlags ?? []).filter(isSegmentQualityFlag),
    startMs: segment.startMs ?? null,
    text: segment.text,
    transcriptId: String(segment.transcriptId),
    transcriptSourceHash: segment.transcriptSourceHash,
    updatedAt: segment.updatedAt,
    videoId: String(segment.videoId),
    warningAccepted: segment.warningAccepted ?? false,
  }
}

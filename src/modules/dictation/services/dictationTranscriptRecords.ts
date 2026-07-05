import type { DictationTranscriptRecord } from '@/models/dictation/DictationTranscriptModel'
import type { DictationTranscriptQualityFlag } from '@/modules/dictation/types'

interface TranscriptCueInput {
  index: number
  text: string
  startMs?: number | null
  endMs?: number | null
}

const transcriptQualityFlags = new Set<DictationTranscriptQualityFlag>([
  'empty',
  'untimed',
  'timed',
  'longSource',
  'shortSource',
  'captionFile',
  'manualText',
  'htmlStripped',
])

function isTranscriptQualityFlag(
  value: string
): value is DictationTranscriptQualityFlag {
  return transcriptQualityFlags.has(value as DictationTranscriptQualityFlag)
}

export function toDictationTranscriptRecord(transcript: {
  _id: unknown
  ownerId: string
  videoId: unknown
  sourceType: DictationTranscriptRecord['sourceType']
  language: string
  isActive: boolean
  rawText: string
  rawCues?: TranscriptCueInput[]
  sourceHash: string
  qualityStatus: DictationTranscriptRecord['qualityStatus']
  qualityFlags?: string[]
  cueCount?: number
  segmentCount?: number
  createdBy?: DictationTranscriptRecord['createdBy']
  createdAt: Date
  updatedAt: Date
}): DictationTranscriptRecord {
  return {
    id: String(transcript._id),
    ownerId: transcript.ownerId,
    videoId: String(transcript.videoId),
    sourceType: transcript.sourceType,
    language: transcript.language,
    isActive: transcript.isActive,
    rawText: transcript.rawText,
    rawCues: (transcript.rawCues ?? []).map(cue => ({
      index: cue.index,
      text: cue.text,
      startMs: cue.startMs ?? null,
      endMs: cue.endMs ?? null,
    })),
    sourceHash: transcript.sourceHash,
    qualityStatus: transcript.qualityStatus,
    qualityFlags: (transcript.qualityFlags ?? []).filter(
      isTranscriptQualityFlag
    ),
    cueCount: transcript.cueCount ?? 0,
    segmentCount: transcript.segmentCount ?? 0,
    createdBy: transcript.createdBy ?? 'manual',
    createdAt: transcript.createdAt,
    updatedAt: transcript.updatedAt,
  }
}

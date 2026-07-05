import type {
  DictationCueRecord,
  DictationSegmentApiRecord,
  DictationSegmentQualityFlag,
} from '@/modules/dictation/types'

export interface SegmentDraft {
  cueIndexes: number[]
  endMs: number | null
  normalizedText: string
  order: number
  qualityFlags: DictationSegmentQualityFlag[]
  startMs: number | null
  text: string
  warningAccepted: boolean
}

export interface BuildSegmentsInput {
  rawCues: DictationCueRecord[]
  rawText: string
}

export interface BuildSegmentsResult {
  qualityFlags: DictationSegmentQualityFlag[]
  qualityStatus: 'blocked' | 'warning' | 'ready'
  segments: SegmentDraft[]
}

export type EditableSegment = Pick<
  DictationSegmentApiRecord,
  | 'cueIndexes'
  | 'endMs'
  | 'id'
  | 'normalizedText'
  | 'order'
  | 'qualityFlags'
  | 'startMs'
  | 'text'
  | 'warningAccepted'
>

export type SegmentEditAction =
  | {
      action: 'acceptWarning'
    }
  | {
      action: 'edit'
      endMs?: number | null
      startMs?: number | null
      text: string
    }
  | {
      action: 'mergeNext'
    }
  | {
      action: 'mergePrevious'
    }
  | {
      action: 'split'
      splitAt: number
    }

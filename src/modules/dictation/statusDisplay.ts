import type { PAGE_TAG_TONES } from '@/constants/theme'
import type {
  DictationImportStatus,
  DictationTranscriptQualityStatus,
  DictationTranscriptStatus,
  DictationVideoStatus,
} from '@/modules/dictation/types'

export type DictationDisplayStatus =
  | DictationImportStatus
  | DictationTranscriptQualityStatus
  | DictationTranscriptStatus
  | DictationVideoStatus
  | 'waiting'

export type DictationStatusTone = keyof typeof PAGE_TAG_TONES

const STATUS_LABELS: Record<DictationDisplayStatus, string> = {
  archived: 'Archived',
  blocked: 'Blocked',
  completed: 'Completed',
  draft: 'Draft',
  failed: 'Failed',
  inProgress: 'In Progress',
  manualAdded: 'Transcript Added',
  manualNeeded: 'Needs Transcript',
  metadataFailed: 'Metadata Failed',
  metadataReady: 'Metadata Ready',
  metadataReadyEmbedBlocked: 'Embed Blocked',
  metadataWarning: 'Metadata Warning',
  needsTranscript: 'Needs Transcript',
  none: 'No Transcript',
  ready: 'Ready',
  segmenting: 'Segmenting',
  transcriptReady: 'Transcript Ready',
  waiting: 'Waiting',
  warning: 'Warning',
}

const STATUS_TONES: Record<DictationDisplayStatus, DictationStatusTone> = {
  archived: 'pale',
  blocked: 'red',
  completed: 'ink',
  draft: 'default',
  failed: 'red',
  inProgress: 'sky',
  manualAdded: 'sky',
  manualNeeded: 'red',
  metadataFailed: 'red',
  metadataReady: 'sky',
  metadataReadyEmbedBlocked: 'red',
  metadataWarning: 'red',
  needsTranscript: 'red',
  none: 'default',
  ready: 'yellow',
  segmenting: 'default',
  transcriptReady: 'pale',
  waiting: 'default',
  warning: 'red',
}

export function getDictationStatusLabel(status: DictationDisplayStatus) {
  return STATUS_LABELS[status]
}

export function getDictationStatusTone(status: DictationDisplayStatus) {
  return STATUS_TONES[status]
}

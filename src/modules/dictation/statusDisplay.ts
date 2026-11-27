import type { PAGE_TAG_TONES } from '@/constants/theme'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
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

const STATUS_TONES: Record<DictationDisplayStatus, DictationStatusTone> = {
  archived: 'pale',
  blocked: 'red',
  draft: 'default',
  failed: 'red',
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

/**
 * The reader-facing label for a status. Pass the learner's
 * `t.dictation.status`; English is the default.
 */
export function getDictationStatusLabel(
  status: DictationDisplayStatus,
  labels: Messages['dictation']['status'] = en.dictation.status
) {
  return labels[status]
}

export function getDictationStatusTone(status: DictationDisplayStatus) {
  return STATUS_TONES[status]
}

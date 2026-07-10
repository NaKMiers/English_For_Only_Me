import type { DictationVideoRecord } from '@/models/dictation/DictationVideoModel'
import type { DictationLevel } from '@/modules/dictation/levels'

export function toDictationVideoRecord(video: {
  _id: unknown
  ownerId: string
  sourceType?: 'youtube'
  title: string
  youtubeUrl: string
  sourceUrl?: string | null
  youtubeVideoId?: string | null
  channelTitle?: string | null
  thumbnailUrl?: string | null
  durationSeconds?: number | null
  defaultLanguage?: string
  purpose?: DictationVideoRecord['purpose']
  status: DictationVideoRecord['status']
  transcriptStatus: DictationVideoRecord['transcriptStatus']
  importStatus?: DictationVideoRecord['importStatus']
  importWarning?: string | null
  activeTranscriptId?: unknown
  sentenceCount?: number
  completedSessionCount?: number
  tags?: string[]
  collections?: string[]
  topicId?: unknown
  sectionId?: unknown
  level?: DictationLevel | null
  lastPracticedAt?: Date | null
  createdAt: Date
  updatedAt: Date
}): DictationVideoRecord {
  return {
    id: String(video._id),
    ownerId: video.ownerId,
    sourceType: video.sourceType ?? 'youtube',
    title: video.title,
    youtubeUrl: video.youtubeUrl,
    youtubeVideoId: video.youtubeVideoId ?? null,
    sourceUrl: video.sourceUrl ?? null,
    channelTitle: video.channelTitle ?? null,
    thumbnailUrl: video.thumbnailUrl ?? null,
    durationSeconds: video.durationSeconds ?? null,
    defaultLanguage: video.defaultLanguage ?? 'en',
    purpose: video.purpose ?? 'ielts-listening',
    status: video.status,
    transcriptStatus: video.transcriptStatus,
    importStatus: video.importStatus ?? 'draft',
    importWarning: video.importWarning ?? null,
    activeTranscriptId: video.activeTranscriptId
      ? String(video.activeTranscriptId)
      : null,
    sentenceCount: video.sentenceCount ?? 0,
    completedSessionCount: video.completedSessionCount ?? 0,
    tags: video.tags ?? [],
    collections: video.collections ?? [],
    topicId: video.topicId ? String(video.topicId) : null,
    sectionId: video.sectionId ? String(video.sectionId) : null,
    level: video.level ?? null,
    lastPracticedAt: video.lastPracticedAt ?? null,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
  }
}

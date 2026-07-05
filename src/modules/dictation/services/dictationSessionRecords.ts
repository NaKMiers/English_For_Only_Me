import type { DictationSessionRecord } from '@/models/dictation/DictationSessionModel'

export function toDictationSessionRecord(session: {
  _id: unknown
  completedAt?: Date | null
  createdAt: Date
  currentSegmentId?: unknown
  currentSegmentOrder?: number
  isVideoHidden?: boolean
  lastActiveAt: Date
  ownerId: string
  playbackSpeed?: number
  showShortcuts?: boolean
  startedAt: Date
  status: DictationSessionRecord['status']
  transcriptId: unknown
  updatedAt: Date
  videoId: unknown
}): DictationSessionRecord {
  return {
    id: String(session._id),
    completedAt: session.completedAt ?? null,
    createdAt: session.createdAt,
    currentSegmentId: session.currentSegmentId
      ? String(session.currentSegmentId)
      : null,
    currentSegmentOrder: session.currentSegmentOrder ?? 0,
    isVideoHidden: session.isVideoHidden ?? false,
    lastActiveAt: session.lastActiveAt,
    ownerId: session.ownerId,
    playbackSpeed: session.playbackSpeed ?? 1,
    showShortcuts: session.showShortcuts ?? true,
    startedAt: session.startedAt,
    status: session.status,
    transcriptId: String(session.transcriptId),
    updatedAt: session.updatedAt,
    videoId: String(session.videoId),
  }
}

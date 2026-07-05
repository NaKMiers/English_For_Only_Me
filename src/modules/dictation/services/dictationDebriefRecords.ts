import type { DictationDebriefApiRecord } from '@/modules/dictation/types'

export function toDictationDebriefRecord(debrief: {
  _id: unknown
  caveats?: string[] | null
  confidence?: number | null
  contentSummary?: string | null
  createdAt: Date
  failureReason?: string | null
  inputSnapshotHash: string
  keyVocabulary?: DictationDebriefApiRecord['keyVocabulary'] | null
  listeningTraps?: string[] | null
  model: string
  nextActions?: string[] | null
  ownerId: string
  promptVersion: string
  sessionId: unknown
  status: DictationDebriefApiRecord['status']
  updatedAt: Date
  videoId: unknown
  weakPatterns?: string[] | null
}): DictationDebriefApiRecord {
  return {
    id: String(debrief._id),
    caveats: debrief.caveats ?? [],
    confidence: debrief.confidence ?? 0,
    contentSummary: debrief.contentSummary ?? '',
    createdAt: debrief.createdAt,
    failureReason: debrief.failureReason ?? null,
    inputSnapshotHash: debrief.inputSnapshotHash,
    keyVocabulary: debrief.keyVocabulary ?? [],
    listeningTraps: debrief.listeningTraps ?? [],
    model: debrief.model,
    nextActions: debrief.nextActions ?? [],
    ownerId: debrief.ownerId,
    promptVersion: debrief.promptVersion,
    sessionId: String(debrief.sessionId),
    status: debrief.status,
    updatedAt: debrief.updatedAt,
    videoId: String(debrief.videoId),
    weakPatterns: debrief.weakPatterns ?? [],
  }
}

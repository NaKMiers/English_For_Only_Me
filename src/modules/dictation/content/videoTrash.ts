import type { DictationVideoStatus } from '@/modules/dictation/types'

/**
 * The status a restored video should get, from what it still has: segments
 * mean it can be practiced, an active transcript means it only needs
 * segmenting, and otherwise it is back to waiting for a transcript.
 */
export function restoredVideoStatus(video: {
  activeTranscriptId: string | null
  sentenceCount: number
}): DictationVideoStatus {
  if (video.sentenceCount > 0) return 'ready'
  if (video.activeTranscriptId) return 'transcriptReady'

  return 'needsTranscript'
}

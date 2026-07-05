import type { DictationAttemptApiRecord } from '@/modules/dictation/types'

export function hasCompletedSegmentEffort(
  attempts: Pick<DictationAttemptApiRecord, 'action' | 'isPassed'>[]
) {
  return attempts.some(
    attempt =>
      attempt.isPassed ||
      attempt.action === 'reveal' ||
      attempt.action === 'skip'
  )
}

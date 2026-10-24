import type { DictationSessionStatus } from '@/modules/dictation/types'

/**
 * The completedAt a session PATCH should leave behind. It is stamped only when
 * the status actually moves to completed, so a replayed or keepalive duplicate
 * (or an explicit completion after the attempt route already completed the
 * session) keeps the original time instead of drifting forward.
 */
export function resolveSessionCompletedAt({
  completedAt,
  nextStatus,
  now,
  previousStatus,
}: {
  completedAt: Date | null | undefined
  nextStatus: DictationSessionStatus
  now: Date
  previousStatus: DictationSessionStatus
}): Date | null {
  if (nextStatus !== 'completed') return null
  if (previousStatus === 'completed' && completedAt) return completedAt

  return now
}

import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'

/**
 * Practice time as "12m", "2h" or "1h 5m". No directive on purpose: the
 * stats dashboard (client) and the landing stats strip (server) share it.
 */
export function formatDuration(
  text: Messages['dictation']['duration'],
  durationMs: number
) {
  const totalMinutes = Math.round(durationMs / 60000)

  if (totalMinutes <= 0) return format(text.minutes, { minutes: 0 })

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return format(text.minutes, { minutes })
  if (minutes === 0) return format(text.hours, { hours })

  return format(text.hoursMinutes, { hours, minutes })
}

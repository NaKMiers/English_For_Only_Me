'use client'

import { useEffect, useRef, useState } from 'react'

export const IELTS_TIMER_WARNING_SECONDS = 5 * 60

export function secondsUntil(deadlineAt: string | null, now: number) {
  if (!deadlineAt) return null

  return Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000))
}

export function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

/**
 * Seconds left until a mock deadline, ticking once a second. Calls
 * `onWarning` once at five minutes and `onExpire` once at zero. A null
 * deadline (listening before the audio starts, or practice) never ticks.
 */
export function useMockDeadline({
  deadlineAt,
  onExpire,
  onWarning,
}: {
  deadlineAt: string | null
  onExpire: () => void
  onWarning?: () => void
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(() =>
    secondsUntil(deadlineAt, Date.now())
  )
  const warnedRef = useRef(false)
  const expiredRef = useRef(false)
  const onExpireRef = useRef(onExpire)
  const onWarningRef = useRef(onWarning)

  useEffect(() => {
    onExpireRef.current = onExpire
    onWarningRef.current = onWarning
  })

  useEffect(() => {
    if (!deadlineAt) return

    const tick = () => {
      const left = secondsUntil(deadlineAt, Date.now()) ?? 0

      setSecondsLeft(left)

      if (
        left <= IELTS_TIMER_WARNING_SECONDS &&
        left > 0 &&
        !warnedRef.current
      ) {
        warnedRef.current = true
        onWarningRef.current?.()
      }

      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current()
      }
    }

    // A deadline already under five minutes on load does not warn again.
    warnedRef.current =
      (secondsUntil(deadlineAt, Date.now()) ?? 0) <= IELTS_TIMER_WARNING_SECONDS

    tick()

    const id = window.setInterval(tick, 1000)

    return () => window.clearInterval(id)
  }, [deadlineAt])

  return deadlineAt ? secondsLeft : null
}

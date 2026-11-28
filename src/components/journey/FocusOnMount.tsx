'use client'

import { useEffect } from 'react'

/**
 * Moves focus to an element once, when it appears. Session end screens use
 * it on their heading: the control that had focus (Check, Continue) has just
 * unmounted, so focus would otherwise fall back to the page body.
 */
export function FocusOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus({ preventScroll: true })
  }, [targetId])

  return null
}

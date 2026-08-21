'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/**
 * One reveal sweep over the map on first load.
 *
 * Deliberately once and deliberately short. The design doc wanted a cinematic
 * cold open - the grid drawing itself cell by cell, a camera push into the
 * cursed corner - and that was cut: a learner who opens this page daily would
 * come to hate it by the second week. What survives is a single sweep that says
 * "this is a map" and then gets out of the way.
 *
 * `prefers-reduced-motion` is checked BEFORE starting, so a learner who asked
 * for no motion never sees the first frame. The cells are visible from the
 * server render either way - the sweep animates opacity on cells that are
 * already there, so nothing is hidden if this component never runs.
 */
export function DungeonReveal({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current

    if (!host) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cells = [...host.querySelectorAll<HTMLElement>('td')]

    if (cells.length === 0 || typeof cells[0].animate !== 'function') return

    const animations = cells.map((cell, index) =>
      cell.animate(
        [
          { offset: 0, opacity: 0.15 },
          { offset: 1, opacity: 1 },
        ],
        {
          // Staggered by column so the sweep reads left to right, which is the
          // direction the levels run.
          delay: (index % 7) * 45,
          duration: 320,
          easing: 'ease-out',
        }
      )
    )

    return () => {
      for (const animation of animations) animation.cancel()
    }
  }, [])

  return <div ref={hostRef}>{children}</div>
}

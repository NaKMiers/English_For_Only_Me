'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'

interface Props {
  label: string
  /** Id of the "You are here" station to scroll to. */
  targetId: string
}

/**
 * A small floating button, like the grammar page's "Back to my lesson":
 * shown while the "You are here" station is out of view, it scrolls the page
 * (and the station's line, sideways) to that station. The arrow points the
 * way.
 */
export function ContinueFloat({ label, targetId }: Props) {
  const [direction, setDirection] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    const target = document.getElementById(targetId)

    if (!target) return

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry || entry.isIntersecting) setDirection(null)
      else setDirection(entry.boundingClientRect.top < 0 ? 'up' : 'down')
    })

    observer.observe(target)

    return () => observer.disconnect()
  }, [targetId])

  if (!direction) return null

  const Icon = direction === 'up' ? ArrowUp : ArrowDown

  function scrollToTarget() {
    const target = document.getElementById(targetId)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    target?.scrollIntoView({
      behavior: reduce ? 'auto' : 'smooth',
      block: 'center',
      inline: 'center',
    })
    target?.focus({ preventScroll: true })
  }

  return (
    <button
      className="soft-press hover-pop bg-cta text-cta-fg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 fixed right-4 bottom-[calc(max(12px,env(safe-area-inset-bottom))+5rem)] z-30 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg md:right-8 md:bottom-8"
      onClick={scrollToTarget}
      type="button"
    >
      <Icon
        aria-hidden="true"
        className="size-4"
      />
      {label}
    </button>
  )
}

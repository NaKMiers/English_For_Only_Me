'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { NEXT_STOP_ID } from './NextStopCard'

import { shouldReduceMotion } from '@/lib/motion/useReducedMotion'

interface Props {
  /**
   * Element to point at when the target is folded away or missing, e.g. the
   * unit header around a folded lesson.
   */
  fallbackId?: string
  label: string
  /**
   * Any value that changes when the target may have moved without a scroll
   * (a fold opening or closing): the float measures again.
   */
  measureKey?: unknown
  /** The page's next stop card: the float hides while it is in view (P4). */
  nextStopId?: string | null
  /**
   * Once the scroll settles, give the spot a small double bounce so the eye
   * lands on it: a CSS selector for the target's ancestor to bounce (e.g.
   * `li`, the whole video card), or `true` for the target itself. Skipped
   * under reduced motion. Animates `transform`, so it never fights
   * `hover-pop`'s `translate`.
   */
  nudge?: boolean | string
  /** Runs before scrolling, e.g. unfold the unit that holds the target. */
  onBeforeJump?: () => void
  /**
   * Stay on screen even while the target is in view (IELTS, where the
   * float is the only way on): the arrow then points at the target's side
   * of the screen's middle.
   */
  persistent?: boolean
  /** Id of the "You are here" spot to scroll to. */
  targetId: string
}

type Direction = 'up' | 'down'

const NUDGE_KEYFRAMES: Keyframe[] = [
  { transform: 'translateY(0)' },
  { transform: 'translateY(-8px)' },
  { transform: 'translateY(0)' },
  { transform: 'translateY(-4px)' },
  { transform: 'translateY(0)' },
]

/** A small double bounce once the smooth scroll has settled. */
function nudgeAfterScroll(target: HTMLElement, nudge: true | string) {
  const element =
    nudge === true ? target : (target.closest<HTMLElement>(nudge) ?? target)
  let done = false

  function bounce() {
    if (done) return
    done = true
    window.removeEventListener('scrollend', bounce)
    element.animate?.(NUDGE_KEYFRAMES, { duration: 700, easing: 'ease-out' })
  }

  window.addEventListener('scrollend', bounce, { once: true })
  // Already in place (no scroll) or no scrollend support: bounce anyway.
  window.setTimeout(bounce, 650)
}

function inView(rect: DOMRect): boolean {
  return rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
}

/**
 * The small floating Continue button: shown while the learner's spot is out
 * of view (and the next stop card is not on screen), or always when
 * `persistent`, it scrolls the page to that spot. The arrow points the way.
 * Measured on scroll, resize, page height changes (a ResizeObserver) and a
 * settle timeout, since an IntersectionObserver misreads a target inside a
 * fold that is still animating open.
 */
export function ContinueFloat({
  fallbackId,
  label,
  measureKey,
  nextStopId = NEXT_STOP_ID,
  nudge = false,
  onBeforeJump,
  persistent = false,
  targetId,
}: Props) {
  const [direction, setDirection] = useState<Direction | null>(null)
  const jumpFrame = useRef<number | null>(null)

  useEffect(() => {
    let frame: number | null = null

    function measure() {
      frame = null
      const target = document.getElementById(targetId)
      const targetRect = target?.getBoundingClientRect()
      const fallback = fallbackId ? document.getElementById(fallbackId) : null
      const anchorRect =
        targetRect && targetRect.height > 0
          ? targetRect
          : fallback?.getBoundingClientRect()

      if (!anchorRect) {
        setDirection(null)
        return
      }

      if (persistent) {
        const middle = (anchorRect.top + anchorRect.bottom) / 2

        setDirection(middle < window.innerHeight / 2 ? 'up' : 'down')
        return
      }

      const nextStop = nextStopId ? document.getElementById(nextStopId) : null
      const nextStopRect = nextStop?.getBoundingClientRect()

      if (
        (targetRect && inView(targetRect)) ||
        (nextStopRect && inView(nextStopRect))
      ) {
        setDirection(null)
        return
      }

      setDirection(anchorRect.top < 0 ? 'up' : 'down')
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(measure)
    }

    schedule()
    // Once more after a fold animation settles.
    const settle = window.setTimeout(schedule, 450)

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Again whenever the page's height changes: a list that mounts after
    // hydration (a section opening) moves the target without any scroll.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule)
    observer?.observe(document.body)

    return () => {
      observer?.disconnect()
      window.clearTimeout(settle)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [fallbackId, measureKey, nextStopId, persistent, targetId])

  useEffect(
    () => () => {
      if (jumpFrame.current !== null) cancelAnimationFrame(jumpFrame.current)
    },
    []
  )

  if (!direction) return null

  const Icon = direction === 'up' ? ArrowUp : ArrowDown

  function jump() {
    onBeforeJump?.()
    if (jumpFrame.current !== null) cancelAnimationFrame(jumpFrame.current)
    // Next frame: a fold opened by onBeforeJump is in the DOM by then.
    jumpFrame.current = requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      const reduce = shouldReduceMotion()

      target?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'center',
        inline: 'center',
      })
      target?.focus({ preventScroll: true })
      if (target && nudge && !reduce) nudgeAfterScroll(target, nudge)
    })
  }

  return (
    <button
      className="soft-press hover-pop bg-cta text-cta-fg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 fixed right-4 bottom-[calc(max(12px,env(safe-area-inset-bottom))+5rem)] z-30 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg md:right-8 md:bottom-8"
      data-continue-float=""
      onClick={jump}
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

'use client'

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'

import { useTheme } from '@/components/common/ThemeProvider'
import { cn } from '@/lib/utils'

const LAMP_STORAGE_KEY = 'efom-lamp-position'
const DRAG_THRESHOLD = 4
const KEY_STEP = 16

/** Keeps the lamp on screen: `right` is its distance from the right edge. */
function clampRight(right: number, lamp: HTMLElement) {
  const maxRight = Math.max(0, window.innerWidth - lamp.offsetWidth)
  return Math.min(Math.max(right, 0), maxRight)
}

/** Writes a clamped offset onto the lamp element and returns it. */
function placeLamp(lamp: HTMLElement, right: number) {
  const next = clampRight(right, lamp)
  lamp.style.right = `${next}px`
  return next
}

function readSavedRight(): number | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAMP_STORAGE_KEY) ?? 'null')
    if (Number.isFinite(saved?.right)) return saved.right
  } catch {
    // Blocked or corrupt storage: fall back to the default corner.
  }
  return null
}

function saveRight(right: number) {
  try {
    localStorage.setItem(LAMP_STORAGE_KEY, JSON.stringify({ right }))
  } catch {
    // The lamp still moves; it just won't remember the spot.
  }
}

/**
 * Hanging pull-string bulb, fixed to the top-right corner of the viewport
 * (outside the page chrome). It dangles from the top edge on a cord, hangs
 * still at rest, sways on hover/focus, and on click "yanks" down and swings
 * like a real pull lamp while flipping light <-> light-up. The bulb glows warm
 * amber when light-up is on, and sits dim in day mode. Motion is disabled
 * under reduced-motion.
 *
 * Dragging slides it along the top edge, x axis only, with the cord at a fixed
 * length (Left/Right arrow keys do the same). The spot is remembered per
 * browser. The offset lives in a ref and is written straight to the DOM, so a
 * drag never re-renders.
 *
 *        │        <- cord to the top edge
 *       (💡)      <- bulb: pull it to toggle, drag it sideways to move
 */
export function PullStringToggle() {
  const { theme, toggle } = useTheme()
  const [pulling, setPulling] = useState(false)
  const isLightUp = theme === 'lightup'

  const lampRef = useRef<HTMLDivElement>(null)
  const rightRef = useRef<number | null>(null)
  const dragRef = useRef<{
    moved: boolean
    pointerId: number
    startRight: number
    startX: number
  } | null>(null)
  const suppressClickRef = useRef(false)

  function moveTo(right: number) {
    const lamp = lampRef.current
    if (!lamp) return null

    rightRef.current = placeLamp(lamp, right)
    return rightRef.current
  }

  function currentRight() {
    if (rightRef.current !== null) return rightRef.current

    const rect = lampRef.current?.getBoundingClientRect()
    return rect ? window.innerWidth - rect.right : 0
  }

  // SSR always renders the default corner; move to the saved spot after
  // mount, and keep the lamp on screen when the viewport shrinks.
  useEffect(() => {
    const lamp = lampRef.current
    if (!lamp) return

    const saved = readSavedRight()
    if (saved !== null) rightRef.current = placeLamp(lamp, saved)

    function handleResize() {
      if (lamp && rightRef.current !== null)
        rightRef.current = placeLamp(lamp, rightRef.current)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return

    suppressClickRef.current = false
    dragRef.current = {
      moved: false,
      pointerId: event.pointerId,
      startRight: currentRight(),
      startX: event.clientX,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return

    if (!drag.moved) {
      drag.moved = true
      lampRef.current?.classList.add('lamp-hang--dragging')
    }
    moveTo(drag.startRight - dx)
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    if (!drag.moved) return

    // A drag is not a pull: swallow the click that follows the release.
    suppressClickRef.current = true
    lampRef.current?.classList.remove('lamp-hang--dragging')
    if (rightRef.current !== null) saveRight(rightRef.current)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? KEY_STEP : -KEY_STEP
    const next = moveTo(currentRight() + step)
    if (next !== null) saveRight(next)
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    setPulling(true)
    window.setTimeout(() => setPulling(false), 640)
    toggle()
  }

  return (
    <div
      ref={lampRef}
      className="lamp-hang"
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        aria-pressed={isLightUp}
        aria-label={
          isLightUp ? 'Turn off light-up mode' : 'Turn on light-up mode'
        }
        title={
          isLightUp
            ? 'Light-up mode is on. Drag sideways to move'
            : 'Pull to light up. Drag sideways to move'
        }
        className={cn('lamp-hang__btn', pulling && 'lamp-hang--pulling')}
      >
        <span
          className="lamp-hang__cord"
          aria-hidden="true"
        />
        <span
          className="lamp-hang__knob"
          aria-hidden="true"
        />
        <span
          aria-hidden="true"
          className={cn(
            'lamp-hang__bulb',
            isLightUp ? 'lamp-hang__bulb--on' : 'lamp-hang__bulb--off'
          )}
        >
          💡
        </span>
      </button>
    </div>
  )
}

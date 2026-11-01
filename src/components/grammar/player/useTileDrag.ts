'use client'

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'

/** Where a dragged word tile would land if released now. */
export type TileDropTarget =
  { zone: 'line'; position: number } | { zone: 'bank' }

export interface TileDrag {
  tileIndex: number
  /** Pointer position, viewport coordinates. */
  x: number
  y: number
  /** Where the pointer grabbed the tile, so the ghost does not jump. */
  offsetX: number
  offsetY: number
  target: TileDropTarget | null
}

interface Press {
  tileIndex: number
  pointerId: number
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  started: boolean
}

// Movement below this stays a tap, so tapping a tile still picks it.
const DRAG_THRESHOLD = 6
// Drop zones reach a little past their border, forgiving a loose release.
const ZONE_PADDING = 16

function isInside(element: HTMLElement | null, x: number, y: number) {
  if (!element) return false
  const rect = element.getBoundingClientRect()

  return (
    x >= rect.left - ZONE_PADDING &&
    x <= rect.right + ZONE_PADDING &&
    y >= rect.top - ZONE_PADDING &&
    y <= rect.bottom + ZONE_PADDING
  )
}

/**
 * Counts the line slots (`[data-line-slot]`) that come before the pointer in
 * reading order: whole rows above it, plus tiles to its left on its own row.
 */
function linePosition(line: HTMLElement, x: number, y: number) {
  let position = 0

  line.querySelectorAll<HTMLElement>('[data-line-slot]').forEach(slot => {
    const rect = slot.getBoundingClientRect()
    if (rect.bottom < y || (rect.top <= y && rect.left + rect.width / 2 < x))
      position += 1
  })

  return position
}

/**
 * Pointer-based drag for the sentence-order card. Pointer events instead of
 * HTML5 drag and drop because the native one does not fire for touch on most
 * phones, and Firefox will not start a drag from a <button>.
 */
export function useTileDrag({
  bankRef,
  lineRef,
  onDrop,
}: {
  bankRef: RefObject<HTMLElement | null>
  lineRef: RefObject<HTMLElement | null>
  onDrop: (tileIndex: number, target: TileDropTarget) => void
}) {
  const [drag, setDrag] = useState<TileDrag | null>(null)
  const pressRef = useRef<Press | null>(null)
  const draggedRef = useRef(false)
  const onDropRef = useRef(onDrop)

  useEffect(() => {
    onDropRef.current = onDrop
  })

  useEffect(() => {
    function locate(x: number, y: number): TileDropTarget | null {
      const line = lineRef.current
      if (line && isInside(line, x, y))
        return { zone: 'line', position: linePosition(line, x, y) }
      if (isInside(bankRef.current, x, y)) return { zone: 'bank' }

      return null
    }

    function handleMove(event: PointerEvent) {
      const press = pressRef.current
      if (!press || event.pointerId !== press.pointerId) return

      if (!press.started) {
        const distance = Math.hypot(
          event.clientX - press.startX,
          event.clientY - press.startY
        )
        if (distance < DRAG_THRESHOLD) return
        press.started = true
      }

      event.preventDefault()
      setDrag({
        tileIndex: press.tileIndex,
        x: event.clientX,
        y: event.clientY,
        offsetX: press.offsetX,
        offsetY: press.offsetY,
        target: locate(event.clientX, event.clientY),
      })
    }

    function handleEnd(event: PointerEvent) {
      const press = pressRef.current
      if (!press || event.pointerId !== press.pointerId) return
      pressRef.current = null
      if (!press.started) return

      // The browser fires a click right after this pointerup; let the tile
      // skip it, then clear the flag once that click has gone by.
      draggedRef.current = true
      window.setTimeout(() => {
        draggedRef.current = false
      }, 0)

      const target =
        event.type === 'pointerup' ? locate(event.clientX, event.clientY) : null
      setDrag(null)
      if (target) onDropRef.current(press.tileIndex, target)
    }

    // Chrome starts a native drag of the tile's text on the first move, which
    // cancels the pointer stream; keep it from taking over a pressed tile.
    function handleNativeDrag(event: DragEvent) {
      if (pressRef.current) event.preventDefault()
    }

    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    window.addEventListener('dragstart', handleNativeDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
      window.removeEventListener('dragstart', handleNativeDrag)
    }
  }, [bankRef, lineRef])

  function startPress(
    tileIndex: number,
    event: ReactPointerEvent<HTMLElement>
  ) {
    if (!event.isPrimary || event.button !== 0) return
    const rect = event.currentTarget.getBoundingClientRect()

    pressRef.current = {
      tileIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      started: false,
    }
  }

  return {
    drag,
    startPress,
    /** True for the click that ends a drag, which must not count as a tap. */
    wasDragged: () => draggedRef.current,
  }
}

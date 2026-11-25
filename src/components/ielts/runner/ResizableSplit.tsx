'use client'

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useState,
  useSyncExternalStore,
} from 'react'

import { cn } from '@/lib/utils'

const MIN_PERCENT = 30
const MAX_PERCENT = 75
const KEY_STEP = 2
const CHANGE_EVENT = 'ielts-split-change'

function clamp(value: number) {
  return Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value))
}

function readStored(storageKey: string): number | null {
  try {
    const value = Number(window.localStorage.getItem(storageKey))

    return Number.isFinite(value) && value > 0 ? clamp(value) : null
  } catch {
    return null
  }
}

function writeStored(storageKey: string, value: number) {
  try {
    window.localStorage.setItem(storageKey, String(Math.round(value)))
  } catch {
    // Private mode or blocked storage: the width just is not remembered.
  }

  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange)
  window.addEventListener(CHANGE_EVENT, onChange)

  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

interface Options {
  /** Where the learner's width is remembered, one key per runner kind. */
  storageKey: string
  /** Width of the first pane, in percent of the split. */
  defaultPercent: number
  /** Grid placement for layouts with explicit rows (listening). */
  dividerClassName?: string
}

/**
 * A two-pane split the learner can resize from 1024px up. The grid gets a
 * `--split` width for the first pane; the divider drags with the pointer,
 * moves with the arrow keys, and resets on double-click. The width is kept
 * per runner kind in localStorage.
 *
 * Put `gridClassName` and `style` on the grid, then render `divider` between
 * the two panes.
 */
export function useResizableSplit({
  defaultPercent,
  dividerClassName,
  storageKey,
}: Options) {
  const stored = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => null
  )
  // Live width while dragging; saved once on release.
  const [draft, setDraft] = useState<number | null>(null)
  const percent = draft ?? stored ?? defaultPercent

  const percentAt = (event: PointerEvent<HTMLDivElement>) => {
    const grid = event.currentTarget.parentElement

    if (!grid) return percent

    const rect = grid.getBoundingClientRect()

    return clamp(((event.clientX - rect.left) / rect.width) * 100)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    // Keeps the drag from selecting passage text (and the highlighter menu).
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraft(percentAt(event))
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (draft === null) return

    setDraft(percentAt(event))
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (draft === null) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    writeStored(storageKey, draft)
    setDraft(null)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: percent - KEY_STEP,
      ArrowRight: percent + KEY_STEP,
      Home: MIN_PERCENT,
      End: MAX_PERCENT,
    }[event.key]

    if (next === undefined) return

    event.preventDefault()
    writeStored(storageKey, clamp(next))
  }

  const divider = (
    <div
      aria-label="Resize panels"
      aria-orientation="vertical"
      aria-valuemax={MAX_PERCENT}
      aria-valuemin={MIN_PERCENT}
      aria-valuenow={Math.round(percent)}
      className={cn(
        'group bg-manga-black relative hidden w-[3px] cursor-col-resize touch-none outline-none lg:block',
        // A wider invisible hit area than the 3px line.
        'before:absolute before:inset-y-0 before:-right-2 before:-left-2 before:content-[""]',
        dividerClassName
      )}
      onDoubleClick={() => writeStored(storageKey, defaultPercent)}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerUp}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="separator"
      tabIndex={0}
      title="Drag to resize, double-click to reset"
    >
      <span
        aria-hidden="true"
        className={cn(
          'border-manga-black bg-manga-white rounded-tag pointer-events-none absolute top-1/2 left-1/2 grid h-10 w-2.5 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 transition-colors',
          'group-hover:bg-manga-pale-red group-focus-visible:bg-manga-pale-red',
          draft !== null && 'bg-manga-red'
        )}
      />
    </div>
  )

  return {
    divider,
    dragging: draft !== null,
    gridClassName: 'lg:grid-cols-[minmax(0,var(--split))_auto_minmax(0,1fr)]',
    style: { '--split': `${percent}%` } as CSSProperties,
  }
}

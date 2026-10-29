'use client'

import { Eraser, Highlighter, X } from 'lucide-react'
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

import {
  expandToWords,
  type HighlightSpan,
  mergeSpans,
  removeOverlapping,
  spansOverlap,
} from './highlightRanges'
import { offsetWithin, rangeFromOffsets } from './textOffsets'

/** Name of the CSS highlight; styled by `::highlight(ielts-user)` in globals.css. */
const HIGHLIGHT_NAME = 'ielts-user'
const SCOPE_ATTR = 'data-highlight-scope'

type SpansByScope = Record<string, HighlightSpan[]>

interface Picked {
  key: string
  span: HighlightSpan
}

interface MenuState {
  canClear: boolean
  left: number
  picked: Picked[]
  top: number
}

function supportsHighlights() {
  return typeof CSS !== 'undefined' && 'highlights' in CSS
}

/**
 * The current selection as whole-word spans per highlight scope inside
 * `root`, or null when nothing highlightable is selected.
 */
function pickSelection(root: HTMLElement): Picked[] | null {
  const selection = window.getSelection()

  if (!selection || selection.isCollapsed || !selection.rangeCount) return null

  const range = selection.getRangeAt(0)

  if (!root.contains(range.commonAncestorContainer)) return null

  const picked: Picked[] = []

  for (const scope of root.querySelectorAll<HTMLElement>(`[${SCOPE_ATTR}]`)) {
    if (!range.intersectsNode(scope)) continue

    const text = scope.textContent ?? ''
    const start = scope.contains(range.startContainer)
      ? offsetWithin(scope, range.startContainer, range.startOffset)
      : 0
    const end = scope.contains(range.endContainer)
      ? offsetWithin(scope, range.endContainer, range.endOffset)
      : text.length
    const span = expandToWords(text, start, end)
    const key = scope.getAttribute(SCOPE_ATTR)

    if (span && key) picked.push({ key, span })
  }

  return picked.length ? picked : null
}

/**
 * Select text in the exam and a small menu offers Highlight, Clear (when the
 * selection touches a highlight) and Clear all. Highlights always cover whole
 * words. They are painted with the CSS Custom Highlight API, so the text
 * nodes React owns are never touched; areas opt in with
 * `data-highlight-scope="<unique key>"`. Kept for this page visit only.
 */
export function TextHighlighter({
  rootRef,
}: {
  rootRef: RefObject<HTMLElement | null>
}) {
  const [spans, setSpans] = useState<SpansByScope>({})
  const [menu, setMenu] = useState<MenuState | null>(null)
  const pointerDownRef = useRef(false)
  const hasAny = Object.values(spans).some(list => list.length > 0)

  // Paint: rebuild the ranges from offsets whenever the spans change or the
  // DOM under the root does (a part switch remounts the passage).
  useEffect(() => {
    const root = rootRef.current

    if (!root || !supportsHighlights()) return

    let frame = 0

    const paint = () => {
      const ranges: Range[] = []

      for (const [key, list] of Object.entries(spans)) {
        const scope = root.querySelector(`[${SCOPE_ATTR}="${CSS.escape(key)}"]`)

        if (!scope) continue

        for (const [start, end] of list) {
          const range = rangeFromOffsets(scope, start, end)

          if (range) ranges.push(range)
        }
      }

      CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges))
    }

    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(paint)
    })

    paint()
    observer.observe(root, {
      characterData: true,
      childList: true,
      subtree: true,
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [rootRef, spans])

  useEffect(() => () => void CSS.highlights?.delete(HIGHLIGHT_NAME), [])

  const update = useCallback(() => {
    const root = rootRef.current
    const picked = root ? pickSelection(root) : null

    if (!picked) {
      setMenu(null)
      return
    }

    const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect()

    if (!rect) return

    // Touch browsers put their own copy menu above the text: go below there.
    const below =
      window.matchMedia('(pointer: coarse)').matches || rect.top < 64
    const half = 130

    setMenu({
      canClear: picked.some(({ key, span }) =>
        (spans[key] ?? []).some(item => spansOverlap(item, span))
      ),
      left: Math.min(
        Math.max(rect.left + rect.width / 2, half),
        window.innerWidth - half
      ),
      picked,
      top: below ? rect.bottom + 10 : rect.top - 50,
    })
  }, [rootRef, spans])

  useEffect(() => {
    if (!supportsHighlights()) return

    let timer = 0

    const onSelectionChange = () => {
      window.clearTimeout(timer)
      if (window.getSelection()?.isCollapsed) setMenu(null)
      else if (!pointerDownRef.current) timer = window.setTimeout(update, 200)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') pointerDownRef.current = true
    }
    const onPointerUp = () => {
      if (!pointerDownRef.current) return

      pointerDownRef.current = false
      timer = window.setTimeout(update, 0)
    }
    const onScroll = () => setMenu(null)

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('pointerup', onPointerUp)
    document.addEventListener('scroll', onScroll, true)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [update])

  if (!menu) return null

  const finish = (next: SpansByScope) => {
    setSpans(next)
    setMenu(null)
    window.getSelection()?.removeAllRanges()
  }

  const highlight = () => {
    const next = { ...spans }

    for (const { key, span } of menu.picked)
      next[key] = mergeSpans([...(next[key] ?? []), span])

    finish(next)
  }

  const clear = () => {
    const next = { ...spans }

    for (const { key, span } of menu.picked)
      next[key] = removeOverlapping(next[key] ?? [], span)

    finish(next)
  }

  const actions = [
    { Icon: Highlighter, disabled: false, label: 'Highlight', run: highlight },
    { Icon: Eraser, disabled: !menu.canClear, label: 'Clear', run: clear },
    { Icon: X, disabled: !hasAny, label: 'Clear all', run: () => finish({}) },
  ]

  return (
    <div
      aria-label="Highlight"
      className="border-manga-black bg-manga-white rounded-control fixed z-10 flex -translate-x-1/2 overflow-hidden border-2 shadow-[3px_3px_0_var(--manga-black)]"
      // Keep the text selected while a menu button is pressed.
      onPointerDown={event => event.preventDefault()}
      role="toolbar"
      style={{ left: menu.left, top: menu.top }}
    >
      {actions.map(({ Icon, disabled, label, run }) => (
        <button
          className={cn(
            'border-manga-black flex h-9 items-center gap-1.5 border-l-2 px-2.5 font-sans text-xs font-black whitespace-nowrap transition-colors first:border-l-0',
            disabled
              ? 'text-manga-ink-soft cursor-not-allowed opacity-50'
              : 'hover:bg-manga-paper-soft'
          )}
          disabled={disabled}
          key={label}
          onClick={run}
          type="button"
        >
          <Icon
            aria-hidden="true"
            className={cn('size-4', label === 'Highlight' && 'text-amber-600')}
          />
          {label}
        </button>
      ))}
    </div>
  )
}

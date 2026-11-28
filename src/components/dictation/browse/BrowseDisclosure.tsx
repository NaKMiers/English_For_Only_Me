'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const OPEN_EVENT = 'browse-disclosure:open'

/**
 * Opens the disclosure whose panel is `panelId`, wherever it sits on the
 * page (the topic page's floating Continue opens the section holding the
 * next video before it scrolls there).
 */
export function openBrowseDisclosure(panelId: string) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: panelId }))
}

/** DOM id of a disclosure's outer box, e.g. for `ContinueFloat`'s fallback. */
export function browseDisclosureId(panelId: string) {
  return `${panelId}-disclosure`
}

interface Props {
  /**
   * The panel body, mounted only while open. The children prop is serialized
   * into the RSC payload even while closed, so a panel that starts closed
   * should pass a client component with plain-data props
   * (BrowseVideoListClient), not server-rendered cards.
   */
  children: ReactNode
  defaultOpen?: boolean
  /** Server-rendered label row shown inside the toggle button. */
  header: ReactNode
  panelId: string
}

/**
 * The only interactive part of a browse panel: the expand toggle. The header
 * arrives server-rendered; the body is either server-rendered (panels that
 * start open) or a client list fed plain records (panels that start closed).
 */
export function BrowseDisclosure({
  children,
  defaultOpen = false,
  header,
  panelId,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    function onOpen(event: Event) {
      if ((event as CustomEvent<string>).detail === panelId) setOpen(true)
    }

    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [panelId])

  return (
    <div
      className="border-line bg-surface rounded-panel border"
      id={browseDisclosureId(panelId)}
    >
      {/* Raw button: a disclosure trigger relying on aria-expanded. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        className="soft-press hover-pop rounded-panel flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2">{header}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn('size-5 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && children}
    </div>
  )
}

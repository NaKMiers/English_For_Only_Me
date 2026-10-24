'use client'

import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

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

  return (
    <div className="border-manga-black bg-manga-white rounded-panel border-3 shadow-[4px_4px_0_var(--manga-black)]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(value => !value)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
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

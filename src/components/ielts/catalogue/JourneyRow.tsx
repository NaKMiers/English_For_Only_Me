'use client'

import { ChevronsRight } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'

const SIDE_ID = 'ielts-progress-side'

const RowContext = createContext<{
  open: boolean
  toggle: () => void
}>({ open: false, toggle: () => undefined })

/**
 * The journey card and, folded away by default, the recent attempts and
 * weak spots card. The toggle inside the journey card slides the side card
 * out: on wide screens its column grows from nothing beside the journey, on
 * phones its row grows below it. The grid tracks animate, so the journey
 * card eases narrower instead of jumping.
 */
export function JourneyRow({
  children,
  side,
}: {
  /** The journey card; its right edge holds the ProgressToggle. */
  children: ReactNode
  /** The recent attempts and weak spots card. */
  side: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <RowContext value={{ open, toggle: () => setOpen(current => !current) }}>
      <div
        className={cn(
          'grid transition-[grid-template-columns,grid-template-rows,column-gap,row-gap] duration-500 ease-(--ease-out-soft) motion-reduce:transition-none',
          open
            ? 'grid-rows-[auto_1fr] gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:grid-rows-1'
            : 'grid-rows-[auto_0fr] gap-0 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0fr)] lg:grid-rows-1'
        )}
      >
        {children}
        {/* Sized by the journey card on wide screens: its list scrolls. */}
        <div
          className={cn(
            'min-h-0 min-w-0 overflow-hidden transition-[opacity,translate] duration-500 ease-(--ease-out-soft) motion-reduce:transition-none lg:contain-size',
            open
              ? 'translate-x-0 translate-y-0 opacity-100'
              : '-translate-y-2 opacity-0 lg:translate-x-6 lg:translate-y-0'
          )}
          id={SIDE_ID}
          inert={!open}
        >
          {side}
        </div>
      </div>
    </RowContext>
  )
}

/**
 * The handle straddling the journey card's right edge that slides the side card out
 * and back: a double arrow pointing the way it will move (right and left on
 * wide screens, down and up on phones, where the card opens below).
 */
export function ProgressToggle() {
  const t = useMessages().ielts.journey.progress
  const { open, toggle } = useContext(RowContext)
  const label = open ? t.hide : t.show

  return (
    <button
      aria-controls={SIDE_ID}
      aria-expanded={open}
      aria-label={label}
      // Half over the card's right edge (w-8, -right-4). Centred with my-auto,
      // not a translate: hover-pop owns `translate`.
      className={cn(
        'soft-press hover-pop border-line absolute inset-y-0 -right-4 z-10 my-auto grid h-16 w-8 place-items-center rounded-full border',
        open ? 'bg-ink text-board' : 'bg-surface text-accent-orange shadow-sm'
      )}
      onClick={toggle}
      title={label}
      type="button"
    >
      <ChevronsRight
        aria-hidden="true"
        className={cn(
          'size-5 transition-transform duration-300 max-lg:rotate-90',
          open && 'rotate-180 max-lg:-rotate-90'
        )}
      />
    </button>
  )
}

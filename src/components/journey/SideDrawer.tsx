'use client'

import { ChevronsRight } from 'lucide-react'
import { createContext, useContext, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const DEFAULT_SIDE_ID = 'journey-side'

const RowContext = createContext<{
  open: boolean
  sideId: string
  toggle: () => void
}>({ open: false, sideId: DEFAULT_SIDE_ID, toggle: () => undefined })

/**
 * The journey card and, folded away by default, a side card (recent work,
 * weak spots, favorites). The `DrawerHandle` inside the journey card slides
 * the side card out: on wide screens its column grows from nothing beside the
 * journey, on phones its row grows below it. The grid tracks animate, so the
 * journey card eases narrower instead of jumping. While open the row carries
 * `data-drawer-open` on a `group/drawer`, so the card can go compact on wide
 * screens with CSS alone (`group-data-[drawer-open]/drawer:`): stat chips
 * drop their labels, and a card that opts in hides its next stop.
 */
export function DrawerRow({
  children,
  side,
  sideId = DEFAULT_SIDE_ID,
}: {
  /** The journey card; its right edge holds the DrawerHandle. */
  children: ReactNode
  /** The folded side card. */
  side: ReactNode
  sideId?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <RowContext
      value={{ open, sideId, toggle: () => setOpen(current => !current) }}
    >
      <div
        className={cn(
          'group/drawer grid transition-[grid-template-columns,grid-template-rows,column-gap,row-gap] duration-500 ease-(--ease-out-soft) motion-reduce:transition-none',
          open
            ? 'grid-rows-[auto_1fr] gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:grid-rows-1'
            : 'grid-rows-[auto_0fr] gap-0 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0fr)] lg:grid-rows-1'
        )}
        data-drawer-open={open ? '' : undefined}
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
          id={sideId}
          inert={!open}
        >
          {side}
        </div>
      </div>
    </RowContext>
  )
}

/**
 * The handle straddling the journey card's right edge that slides the side
 * card out and back: a double arrow pointing the way it will move (right and
 * left on wide screens, down and up on phones, where the card opens below).
 */
export function DrawerHandle({
  accentClassName = 'text-ink',
  hideLabel,
  showLabel,
}: {
  /** The module accent for the closed handle's arrow. */
  accentClassName?: string
  hideLabel: string
  showLabel: string
}) {
  const { open, sideId, toggle } = useContext(RowContext)
  const label = open ? hideLabel : showLabel

  return (
    <button
      aria-controls={sideId}
      aria-expanded={open}
      aria-label={label}
      // Half over the card's right edge (w-8, -right-4). Centred with my-auto,
      // not a translate: hover-pop owns `translate`. Raw button: a disclosure
      // trigger relying on aria-expanded / aria-controls.
      className={cn(
        'soft-press hover-pop border-line absolute inset-y-0 -right-4 z-10 my-auto grid h-16 w-8 place-items-center rounded-full border',
        // The pill is 32px wide; the hit area is 44px.
        "before:absolute before:-inset-x-1.5 before:inset-y-0 before:content-['']",
        open
          ? 'bg-cta text-cta-fg'
          : cn('bg-surface shadow-sm', accentClassName)
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

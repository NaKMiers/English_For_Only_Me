'use client'

import { ChevronDown } from 'lucide-react'
import { type MouseEvent, type ReactNode, useState } from 'react'

import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

/**
 * The IELTS page's top panel: a header line that folds the progress below
 * it. A click anywhere on the line toggles it (links and buttons in it keep
 * their own job); the chevron is the keyboard and screen-reader control.
 * Starts folded. Without progress there is nothing to fold, so the line is
 * plain.
 */
export function OverviewPanel({
  actions,
  children,
  heading,
}: {
  actions: ReactNode
  children?: ReactNode
  heading: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const foldable = Boolean(children)

  const toggleFromLine = (event: MouseEvent<HTMLDivElement>) => {
    if (!foldable) return
    if ((event.target as HTMLElement).closest('a, button')) return

    setOpen(current => !current)
  }

  return (
    <Collapsible
      onOpenChange={setOpen}
      open={open}
    >
      {/* Mouse shortcut only; the chevron button below is the real control. */}
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-3 gap-y-2',
          foldable && 'cursor-pointer select-none'
        )}
        onClick={toggleFromLine}
      >
        {heading}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          {foldable ? (
            <CollapsibleTrigger
              aria-label="Show or hide weak spots and recent attempts"
              className="group/progress border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control grid size-9 place-items-center border-2"
              title="Weak spots and recent attempts"
            >
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform group-data-[panel-open]/progress:rotate-180"
              />
            </CollapsibleTrigger>
          ) : null}
        </div>
      </div>
      {foldable ? <CollapsiblePanel>{children}</CollapsiblePanel> : null}
    </Collapsible>
  )
}

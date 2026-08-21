import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * The comic page frame.
 *
 * A grid rather than a stack, so panels can differ in width and a page reads as
 * composed instead of as a column of cards. On mobile it collapses to a single
 * column with the panel order preserved - mobile is a real layout here, not a
 * degraded one, and beat order carries the argument.
 */
export function MangaPage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2 sm:gap-4 [&>*]:min-w-0',
        className
      )}
    >
      {children}
    </div>
  )
}

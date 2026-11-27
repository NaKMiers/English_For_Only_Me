import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Wrapper for a route's hero block (breadcrumb / eyebrow tag / h1 / description)
 * that sits directly on the PageShell board rather than inside a card.
 */
export function PageHero({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <header className={cn('page-hero grid gap-2', className)}>
      {children}
    </header>
  )
}

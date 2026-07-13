import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * Wrapper for a route's hero block (breadcrumb / eyebrow tag / h1 / description)
 * that sits directly on the MangaPageShell paper rather than inside a card.
 *
 * In day mode this renders bare (unchanged look). In light-up mode the shell
 * paper goes dark, so `.page-hero` (see globals.css) lifts the block into a
 * lit card - otherwise its dark ink text would be invisible on the dark room.
 * Centralizing it keeps the fix DRY across every route hero.
 */
export function PageHero({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <header className={cn('page-hero grid gap-2', className)}>{children}</header>
  )
}

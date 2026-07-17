import type { ReactNode } from 'react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/*
 * Shared building blocks for route `loading.tsx` skeletons. They reuse the real
 * shell (MangaPageShell + AppTopbar) and mirror the manga aesthetic: hard
 * corners, thick ink borders, pulsing `--muted` (pale red) fills. Compose these
 * so each skeleton mirrors the structure of the page it stands in for.
 */

/** Borderless pulsing bar, for text/line placeholders. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-4 rounded-none', className)} />
}

/** Bordered pulsing box, the default manga skeleton surface. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn('border-manga-black rounded-none border-3', className)}
    />
  )
}

/** Small chip mirroring PageTag. */
export function SkeletonTag({ className }: { className?: string }) {
  return <SkeletonBlock className={cn('h-8 w-24 border-2', className)} />
}

/** Page hero: eyebrow chip + big title line + a couple of subtitle lines. */
export function SkeletonHero({ withEyebrow = true }: { withEyebrow?: boolean }) {
  return (
    <header className="page-hero grid gap-3">
      {withEyebrow ? <SkeletonTag /> : null}
      <SkeletonLine className="h-9 w-2/3 max-w-md" />
      <div className="grid gap-2">
        <SkeletonLine className="w-full max-w-2xl" />
        <SkeletonLine className="w-4/5 max-w-xl" />
      </div>
    </header>
  )
}

/** MangaPanel-shaped card: header row + content lines. */
export function SkeletonPanel({
  className,
  lines = 3,
  withHeader = true,
}: {
  className?: string
  lines?: number
  withHeader?: boolean
}) {
  return (
    <div
      className={cn(
        'border-manga-black bg-manga-white grid gap-4 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)] sm:p-5',
        className
      )}
    >
      {withHeader ? (
        <div className="flex items-center gap-3">
          <SkeletonTag className="w-20" />
          <SkeletonLine className="h-6 w-40" />
        </div>
      ) : null}
      <div className="grid gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLine
            key={index}
            className={index === lines - 1 ? 'w-2/3' : 'w-full'}
          />
        ))}
      </div>
    </div>
  )
}

/** Row of stat tiles (vocab/dictation overviews). */
export function SkeletonTileRow({
  count = 5,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-5', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className="h-24"
        />
      ))}
    </div>
  )
}

/** Single browse video card (thumbnail + tags + title + action). */
export function SkeletonVideoCard() {
  return (
    <div className="border-manga-black bg-manga-white grid gap-2 border-2 p-2">
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex gap-1.5">
        <Skeleton className="h-6 w-14 rounded-none" />
        <Skeleton className="h-6 w-16 rounded-none" />
      </div>
      <Skeleton className="h-5 w-full rounded-none" />
      <Skeleton className="h-5 w-2/3 rounded-none" />
      <Skeleton className="border-manga-black h-9 w-full rounded-none border-2" />
    </div>
  )
}

/** Responsive grid of video cards. */
export function SkeletonVideoGrid({
  count = 8,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <li key={index}>
          <SkeletonVideoCard />
        </li>
      ))}
    </ul>
  )
}

/** Stack of full-width row blocks, for lists/queues. */
export function SkeletonRows({
  count = 4,
  rowClassName,
}: {
  count?: number
  rowClassName?: string
}) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className={cn('h-20', rowClassName)}
        />
      ))}
    </div>
  )
}

/**
 * Full-page frame: the real shell + topbar with a padded content section.
 * Mirrors what every page renders itself (there is no shared shell layout).
 */
export function SkeletonPageShell({
  activeHref,
  subtitle,
  footer,
  children,
}: {
  activeHref?: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <MangaPageShell
      footer={footer}
      topbar={
        <AppTopbar
          activeHref={activeHref}
          subtitle={subtitle}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">{children}</section>
    </MangaPageShell>
  )
}

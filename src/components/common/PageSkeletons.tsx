import type { ComponentProps, ReactNode } from 'react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/*
 * Shared building blocks for route `loading.tsx` skeletons. They reuse the real
 * shell (PageShell + AppTopbar) and the board's calm surfaces: hairline
 * borders and pulsing `muted` fills. Compose these so each skeleton mirrors
 * the structure of the page it stands in for, down to the corner role: a
 * skeleton whose radius differs from the block it replaces visibly snaps shape
 * when the content lands.
 */

/** Borderless pulsing bar, for text/line placeholders. */
export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('rounded-tag h-4', className)} />
}

/** Bordered pulsing box, the default skeleton surface. */
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <Skeleton className={cn('border-line rounded-panel border', className)} />
  )
}

/** Small chip mirroring PageTag. */
export function SkeletonTag({ className }: { className?: string }) {
  return (
    <SkeletonBlock className={cn('rounded-tag h-8 w-24 border', className)} />
  )
}

/** PageHeader: module icon circle, an optional eyebrow, title and one line. */
export function SkeletonHero({
  withEyebrow = true,
}: {
  withEyebrow?: boolean
}) {
  return (
    <header className="flex items-center gap-3 sm:gap-4">
      <Skeleton className="size-12 shrink-0 rounded-full sm:size-14" />
      <div className="grid min-w-0 flex-1 gap-2">
        {withEyebrow ? <SkeletonLine className="h-3 w-24" /> : null}
        <SkeletonLine className="h-8 w-2/3 max-w-sm" />
        <SkeletonLine className="w-full max-w-xl" />
      </div>
    </header>
  )
}

/**
 * The `JourneyCard` shape: title, big headline, metaphor, chips and the next
 * stop (a right column from lg, or last in `stacked`), so nothing jumps when
 * the landing arrives.
 */
export function SkeletonJourney({
  chips = 4,
  layout = 'split',
  metaphorClassName = 'h-40',
}: {
  chips?: number
  layout?: 'split' | 'stacked'
  /** Height of the module's picture, e.g. the staircase or the trail. */
  metaphorClassName?: string
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'border-line bg-surface-muted rounded-panel grid gap-5 border p-4 sm:p-6',
        layout === 'split' && 'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]'
      )}
    >
      <div className="grid content-between gap-5">
        <div className="grid gap-2">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="h-12 w-48" />
        </div>
        <Skeleton className={cn('rounded-control w-full', metaphorClassName)} />
        <div className="grid gap-3">
          <SkeletonLine className="w-56" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: chips }).map((_, index) => (
              <Skeleton
                className="h-9 w-24 rounded-full"
                key={index}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="bg-surface rounded-panel grid content-between gap-5 p-5">
        <Skeleton className="h-6 w-28 rounded-full" />
        <div className="grid gap-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="h-7 w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full" />
      </div>
    </div>
  )
}

/**
 * A focus screen (lesson player, dictation practice): header row, one card
 * and the footer bar, one viewport tall, with no topbar or tab bar so they do
 * not flash before the full-height page lands.
 */
export function SkeletonPlayer({ label }: { label: string }) {
  return (
    <PageShell fullHeight>
      <div
        aria-busy
        aria-label={label}
        className="flex h-full flex-col gap-4 p-4 md:pr-6 md:pl-0"
      >
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 shrink-0 rounded-full" />
          <Skeleton className="h-2 flex-1 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <SkeletonBlock className="min-h-60 flex-1" />
        <div className="flex justify-end">
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>
    </PageShell>
  )
}

/** ContentPanel-shaped card: header row + content lines. */
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
        'border-line bg-surface rounded-panel grid gap-4 border p-4 sm:p-5',
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
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-5', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonBlock
          key={index}
          className="h-24"
        />
      ))}
    </div>
  )
}

/** Single browse video card (thumbnail, tags, title). */
export function SkeletonVideoCard() {
  return (
    <div className="border-line bg-surface rounded-panel grid gap-2 border p-2">
      <Skeleton className="rounded-control aspect-video w-full" />
      <div className="flex gap-1.5">
        <Skeleton className="rounded-tag h-6 w-14" />
        <Skeleton className="rounded-tag h-6 w-16" />
      </div>
      <Skeleton className="rounded-tag h-5 w-full" />
      <Skeleton className="rounded-tag h-5 w-2/3" />
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
        // Same columns as BrowseVideoList, so the cards land in place.
        'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
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
  page,
  showAccount,
  subtitle,
  footer,
  children,
}: {
  activeHref?: string
  /** The page's topbar title (AppTopbar `page`), so it does not pop in. */
  page?: ComponentProps<typeof AppTopbar>['page']
  /** The home topbar's account chip, so it does not pop in after loading. */
  showAccount?: boolean
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <PageShell
      footer={footer}
      topbar={
        <AppTopbar
          activeHref={activeHref}
          page={page}
          showAccount={showAccount}
          subtitle={subtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        {children}
      </section>
    </PageShell>
  )
}

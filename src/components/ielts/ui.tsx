import type { ComponentProps, ReactNode } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { PageHero } from '@/components/common/PageHero'
import { IconButton } from '@/components/ui/IconButton'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { cn } from '@/lib/utils'

/*
 * IELTS building blocks. They are thin wrappers over the app's manga
 * primitives (MangaButton, IconButton, MangaPanel, MetricTile, PageTag), so
 * the module wears the same sticker look and follows the light-up theme. The
 * wrappers only add what the module needs on top: a `danger` button tone and
 * the page frame.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type Tone = 'primary' | 'paper' | 'ink' | 'danger'

type ExamButtonProps = DistributiveOmit<
  ComponentProps<typeof MangaButton>,
  'tone'
> & { tone?: Tone }

export function ExamButton({ className, tone, ...rest }: ExamButtonProps) {
  return (
    <MangaButton
      {...(rest as ComponentProps<typeof MangaButton>)}
      className={cn(tone === 'danger' && 'text-manga-red', className)}
      tone={tone === 'danger' ? 'paper' : tone}
    />
  )
}

export function ExamIconButton(props: ComponentProps<typeof IconButton>) {
  return <IconButton {...props} />
}

export function ExamCard(props: ComponentProps<typeof MangaPanel>) {
  return <MangaPanel {...props} />
}

export function StatTile({
  className,
  ...props
}: Omit<ComponentProps<typeof MetricTile>, 'href' | 'icon' | 'trend'>) {
  return (
    <MetricTile
      {...props}
      className={cn('min-h-0', className)}
    />
  )
}

const BADGE_TONES = {
  default: 'default',
  pale: 'pale',
  ink: 'ink',
  accent: 'red',
} as const

export function ExamBadge({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: keyof typeof BADGE_TONES
}) {
  return (
    <PageTag
      className={cn('w-fit', className)}
      tone={BADGE_TONES[tone]}
    >
      {children}
    </PageTag>
  )
}

/**
 * Classes for a segmented toggle button (`aria-pressed`): a small sticker
 * that sits pressed into the page, inked, while it is the active choice.
 */
export function segmentClass(active: boolean, className?: string) {
  return cn(
    'border-manga-black rounded-control sticker-press min-h-9 border-2 px-3 font-sans text-sm font-black',
    active
      ? 'bg-manga-black text-manga-white translate-x-[2px] translate-y-[2px]'
      : 'bg-manga-white text-manga-black hover:bg-manga-pale-red shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
    className
  )
}

/** Page frame for an IELTS route inside `MangaPageShell`. */
export function ExamSheet({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-6 p-3 sm:p-5 lg:p-6', className)}>
      {children}
    </div>
  )
}

/** Route hero (breadcrumb, tag, h1) that stays readable in light-up. */
export function ExamHero({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <PageHero className={className}>{children}</PageHero>
}

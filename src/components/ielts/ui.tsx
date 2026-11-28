import type { ComponentProps, ReactNode } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { IconButton } from '@/components/ui/IconButton'
import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'

/*
 * IELTS building blocks. They are thin wrappers over the app's manga
 * primitives (ActionButton, IconButton, ContentPanel, PageTag), so
 * the module wears the same sticker look and follows the light-up theme. The
 * wrappers only add what the module needs on top: a `danger` button tone and
 * the page frame.
 */

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type Tone = 'primary' | 'paper' | 'ink' | 'danger'

type ExamButtonProps = DistributiveOmit<
  ComponentProps<typeof ActionButton>,
  'tone'
> & { tone?: Tone }

export function ExamButton({ className, tone, ...rest }: ExamButtonProps) {
  return (
    <ActionButton
      {...(rest as ComponentProps<typeof ActionButton>)}
      className={cn(tone === 'danger' && 'text-danger', className)}
      tone={tone === 'danger' ? 'paper' : tone}
    />
  )
}

export function ExamIconButton(props: ComponentProps<typeof IconButton>) {
  return <IconButton {...props} />
}

export function ExamCard(props: ComponentProps<typeof ContentPanel>) {
  return <ContentPanel {...props} />
}

/**
 * Classes for a segmented toggle button (`aria-pressed`): a small sticker
 * that sits pressed into the page, inked, while it is the active choice.
 */
export function segmentClass(active: boolean, className?: string) {
  return cn(
    'border-line rounded-control soft-press min-h-11 border px-3 font-sans text-sm font-medium sm:min-h-9',
    active
      ? 'bg-cta text-cta-fg'
      : 'bg-surface text-ink hover:bg-tint-soft hover-pop',
    className
  )
}

/**
 * The full-screen exam frame (runner, mock, drill and their skeleton): it
 * covers the app shell so the test reads like paper.
 */
export function ExamFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('ielts-exam fixed inset-0 z-[70] flex flex-col', className)}
    >
      {children}
    </div>
  )
}

/** Page frame for an IELTS route inside `PageShell`. */
export function ExamSheet({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid gap-5 px-4 pb-6 md:pr-6 md:pl-0', className)}>
      {children}
    </div>
  )
}

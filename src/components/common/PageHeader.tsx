import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface Props {
  /** Right-hand slot: a stat chip, a link, the page's main action. */
  actions?: ReactNode
  /** Line above the title, e.g. a breadcrumb or a small tag. */
  eyebrow?: ReactNode
  /** Pastel circle on the left, holding the module icon. */
  icon?: ReactNode
  /** Module tint for the icon circle, e.g. `bg-pastel-sky text-accent-blue`. */
  iconClassName?: string
  className?: string
  /** One short line under the title. */
  subtitle?: ReactNode
  title: ReactNode
  /** Extra classes for the h1, e.g. `wrap-break-word` for long test names. */
  titleClassName?: string
}

/**
 * The shared head of every module page: an optional module icon, the h1 and
 * one line under it on the left, actions on the right. Same size and rhythm
 * on every route, so moving between modules never jumps.
 */
export function PageHeader({
  actions,
  className,
  eyebrow,
  icon,
  iconClassName,
  subtitle,
  title,
  titleClassName,
}: Props) {
  return (
    <header
      className={cn(
        'page-hero flex flex-wrap items-center justify-between gap-x-4 gap-y-3',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 basis-72 items-center gap-3 sm:gap-4">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-full sm:size-14 [&_svg]:size-6 sm:[&_svg]:size-7',
              iconClassName ?? 'bg-tint text-ink'
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="grid min-w-0 gap-1">
          {eyebrow ? (
            <div className="text-ink-soft min-w-0 text-sm">{eyebrow}</div>
          ) : null}
          <h1
            className={cn(
              'font-sans text-3xl leading-none font-medium tracking-tight sm:text-4xl',
              titleClassName
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="text-ink-soft text-sm leading-5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

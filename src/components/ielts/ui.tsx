import Link from 'next/link'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { cn } from '@/lib/utils'

/*
 * Quiet exam-style building blocks for the IELTS module (see `.ielts-exam`
 * in globals.css): hairline borders, small radii, one blue accent. The props
 * mirror MangaButton / MangaPanel / MetricTile / PageTag so screens swap
 * over one for one.
 */

type Tone = 'primary' | 'paper' | 'ink' | 'danger'

const TONE: Record<Tone, string> = {
  // `ink` is the main action; `primary` (the old pale-red) is a soft accent.
  ink: 'border-ex-accent bg-ex-accent text-white hover:brightness-110',
  primary:
    'border-ex-accent/30 bg-ex-accent-soft text-ex-accent hover:border-ex-accent/60',
  paper: 'border-ex-line bg-white text-ex-ink hover:bg-ex-soft',
  danger: 'border-ex-wrong/40 bg-white text-ex-wrong hover:bg-ex-wrong-soft',
}

const BUTTON =
  'inline-flex min-h-10 max-w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold leading-tight transition-colors disabled:cursor-not-allowed disabled:opacity-50'

interface BaseProps {
  children: ReactNode
  className?: string
  icon?: ReactNode
  tone?: Tone
}

type ExamButtonProps = BaseProps &
  (
    | (Omit<ComponentPropsWithoutRef<typeof Link>, 'children' | 'className'> & {
        href: ComponentPropsWithoutRef<typeof Link>['href']
      })
    | (Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'className'> & {
        href?: never
      })
  )

export function ExamButton(props: ExamButtonProps) {
  const { children, className, icon, tone = 'primary', ...rest } = props
  const classes = cn(BUTTON, TONE[tone], className)
  const content = (
    <>
      {icon ? (
        <span className="grid size-4 shrink-0 place-items-center">{icon}</span>
      ) : null}
      <span className="min-w-0">{children}</span>
    </>
  )

  if ('href' in rest && rest.href !== undefined)
    return (
      <Link
        {...(rest as ComponentPropsWithoutRef<typeof Link>)}
        className={classes}
      >
        {content}
      </Link>
    )

  return (
    <button
      {...(rest as ComponentPropsWithoutRef<'button'>)}
      className={classes}
    >
      {content}
    </button>
  )
}

type IconButtonProps = {
  children: ReactNode
  className?: string
  label: string
} & (
  | (Omit<
      ComponentPropsWithoutRef<typeof Link>,
      'children' | 'className' | 'aria-label'
    > & { href: ComponentPropsWithoutRef<typeof Link>['href'] })
  | (Omit<
      ComponentPropsWithoutRef<'button'>,
      'children' | 'className' | 'aria-label'
    > & { href?: never })
)

export function ExamIconButton(props: IconButtonProps) {
  const { children, className, label, ...rest } = props
  const classes = cn(
    'inline-grid size-10 shrink-0 place-items-center rounded-lg border border-ex-line bg-white text-ex-ink transition-colors hover:bg-ex-soft disabled:opacity-50',
    className
  )

  if ('href' in rest && rest.href !== undefined)
    return (
      <Link
        {...(rest as ComponentPropsWithoutRef<typeof Link>)}
        aria-label={label}
        className={classes}
        title={label}
      >
        {children}
      </Link>
    )

  return (
    <button
      {...(rest as ComponentPropsWithoutRef<'button'>)}
      aria-label={label}
      className={classes}
      title={label}
    >
      {children}
    </button>
  )
}

export function ExamCard({
  action,
  children,
  className,
  eyebrow,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  className?: string
  eyebrow?: string
  title?: string
}) {
  return (
    <section
      className={cn(
        'border-ex-line grid min-w-0 content-start gap-4 rounded-xl border bg-white p-5',
        className
      )}
    >
      {eyebrow || title || action ? (
        <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            {eyebrow ? (
              <p className="text-ex-muted text-xs font-semibold tracking-wide uppercase">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="text-ex-ink font-sans text-lg leading-snug font-bold">
                {title}
              </h2>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>
      ) : null}
      <div className="grid min-w-0 gap-4">{children}</div>
    </section>
  )
}

export function StatTile({
  className,
  detail,
  label,
  tone = 'paper',
  value,
}: {
  className?: string
  detail?: string
  label: string
  tone?: 'paper' | 'ink' | 'red'
  value: string
}) {
  return (
    <article
      className={cn(
        'grid min-w-0 content-start gap-1 rounded-xl border p-4',
        tone === 'ink'
          ? 'border-ex-accent bg-ex-accent-soft'
          : 'border-ex-line bg-white',
        className
      )}
    >
      <span className="text-ex-muted text-xs font-semibold tracking-wide uppercase">
        {label}
      </span>
      <strong
        className={cn(
          'font-sans text-3xl leading-tight font-bold tabular-nums',
          tone === 'ink' ? 'text-ex-accent' : 'text-ex-ink'
        )}
      >
        {value}
      </strong>
      {detail ? <p className="text-ex-muted text-sm">{detail}</p> : null}
    </article>
  )
}

export function ExamBadge({
  children,
  className,
  tone = 'default',
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'pale' | 'ink' | 'accent'
}) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 w-fit items-center rounded-md px-2 text-xs font-semibold',
        tone === 'accent' || tone === 'ink'
          ? 'bg-ex-accent-soft text-ex-accent'
          : 'bg-ex-soft text-ex-muted',
        className
      )}
    >
      {children}
    </span>
  )
}

/** Classes for a segmented toggle button (`aria-pressed`). */
export function segmentClass(active: boolean, className?: string) {
  return cn(
    'min-h-9 rounded-lg border px-3 text-sm font-semibold transition-colors',
    active
      ? 'border-ex-accent bg-ex-accent text-white'
      : 'border-ex-line bg-white text-ex-ink hover:bg-ex-soft',
    className
  )
}

/**
 * The white sheet that holds an IELTS page inside the app shell, so the
 * content stays readable on the light-up room.
 */
export function ExamSheet({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'ielts-exam border-ex-line m-3 grid gap-6 rounded-2xl border p-4 sm:m-4 sm:p-6 lg:p-8',
        className
      )}
    >
      {children}
    </div>
  )
}

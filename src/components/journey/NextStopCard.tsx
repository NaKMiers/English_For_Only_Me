import { ArrowRight, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'

export const NEXT_STOP_ID = 'next-stop'

interface Props {
  /** The button text, e.g. "Start lesson". */
  actionLabel: string
  /** Rendered icon for the button (an element, never a component type). */
  actionIcon?: ReactNode
  /** Extra content under the title, e.g. a small unit progress bar. */
  children?: ReactNode
  className?: string
  /** Small line above the title: where this stop sits on the journey. */
  detail?: ReactNode
  /** All-clear state: shown instead of the title and button. */
  done?: { icon: ReactNode; text: string }
  /** Quiet line beside the button, e.g. a "syncing" note. */
  footer?: ReactNode
  /** A link into the work screen; `null` with `onAction` for a button. */
  href: string | null
  /** Observed by `ContinueFloat` (`nextStopId`). */
  id?: string
  /**
   * A picture of the stop (the dictation video's thumbnail), `card` only:
   * it sits left of the detail and title, with the pin on its corner.
   */
  media?: ReactNode
  /**
   * For a next stop that opens on this page (the vocabulary recall modal):
   * a button instead of a link. Client trees only.
   */
  onAction?: () => void
  /** The pin chip text, `common.journey.nextStop`. */
  pinLabel: string
  /** `sm` is a tighter `card` for a narrow column (vocabulary). */
  size?: 'md' | 'sm'
  title: string
  /** `card` fills the journey card's right column; `compact` is one row. */
  variant?: 'card' | 'compact'
}

/**
 * The one next action of a page: a pink pin chip, where it sits, its title
 * and one `ink` button straight into the work screen. With `done`, the
 * all-clear line instead. Always in the same place, so the habit is "open,
 * click the pinned card".
 */
export function NextStopCard({
  actionIcon,
  actionLabel,
  children,
  className,
  detail,
  done,
  footer,
  href,
  id = NEXT_STOP_ID,
  media,
  onAction,
  pinLabel,
  size = 'md',
  title,
  variant = 'card',
}: Props) {
  const pin = (
    <span className="bg-brand-soft text-brand-ink inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
      <MapPin
        aria-hidden="true"
        className="size-3.5"
      />
      {pinLabel}
    </span>
  )
  const icon = actionIcon ?? (
    <ArrowRight
      aria-hidden="true"
      className="size-4"
    />
  )
  const actionClassName = variant === 'compact' ? 'shrink-0' : undefined
  const action = done ? null : onAction ? (
    <ActionButton
      className={actionClassName}
      icon={icon}
      onClick={onAction}
      tone="ink"
    >
      {actionLabel}
    </ActionButton>
  ) : href !== null ? (
    <ActionButton
      className={actionClassName}
      href={href}
      icon={icon}
      tone="ink"
    >
      {actionLabel}
    </ActionButton>
  ) : null

  if (variant === 'compact')
    return (
      <section
        aria-label={pinLabel}
        className={cn(
          'bg-surface rounded-panel flex min-w-0 flex-wrap items-center gap-3 p-2 pl-3 sm:flex-nowrap',
          className
        )}
        data-next-stop=""
        id={id}
      >
        {done ? (
          <p className="flex items-center gap-3 p-1 text-sm">
            <span className="text-accent-orange shrink-0 [&_svg]:size-5">
              {done.icon}
            </span>
            {done.text}
          </p>
        ) : (
          <>
            <MapPin
              aria-hidden="true"
              className="text-brand size-5 shrink-0"
            />
            <p className="min-w-0 flex-1 truncate text-sm">
              {detail ? (
                <span className="text-ink-soft">{detail} · </span>
              ) : null}
              <span className="font-medium">{title}</span>
            </p>
            {action}
          </>
        )}
      </section>
    )

  return (
    <section
      aria-label={pinLabel}
      className={cn(
        'bg-surface shadow-card rounded-panel grid min-w-0 content-between',
        size === 'sm' ? 'gap-3 p-4' : 'gap-5 p-5',
        className
      )}
      data-next-stop=""
      id={id}
    >
      {media && !done ? (
        <div className="flex min-w-0 items-start gap-3">
          <div className="relative w-36 shrink-0 sm:w-40">
            {media}
            <span className="absolute top-1.5 left-1.5 [&>span]:px-2 [&>span]:py-0.5 [&>span]:shadow-sm">
              {pin}
            </span>
          </div>
          <div className="grid min-w-0 gap-1">
            {detail ? (
              <p className="text-ink-soft truncate text-sm">{detail}</p>
            ) : null}
            <h2 className="line-clamp-3 font-sans text-lg leading-snug font-medium tracking-tight">
              {title}
            </h2>
            {children}
          </div>
        </div>
      ) : (
        pin
      )}
      {media && !done ? null : done ? (
        <p className="flex items-center gap-3 text-sm">
          <span className="shrink-0 [&_svg]:size-6">{done.icon}</span>
          {done.text}
        </p>
      ) : (
        <div className="grid gap-2">
          {detail ? (
            <p className="text-ink-soft truncate text-sm">{detail}</p>
          ) : null}
          <h2
            className={cn(
              'line-clamp-2 font-sans leading-tight font-medium tracking-tight',
              size === 'sm' ? 'text-xl' : 'text-2xl'
            )}
          >
            {title}
          </h2>
          {children}
        </div>
      )}
      {action || footer ? (
        <div className="flex flex-wrap items-center gap-3">
          {action}
          {footer}
        </div>
      ) : null}
    </section>
  )
}

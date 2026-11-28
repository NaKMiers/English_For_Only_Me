import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import type { AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { cn } from '@/lib/utils'

import { FocusOnMount } from './FocusOnMount'

/** Fix-up lists longer than this fold behind a "show more" disclosure. */
export const FIX_UP_VISIBLE_LIMIT = 3

interface FixUp {
  items: ReactNode[]
  /** Text of the disclosure that holds the rest, e.g. "4 more". */
  moreLabel: string
  title: string
}

interface Props {
  className?: string
  /** What went wrong, to practise next. Folded when longer than 3. */
  fixUp?: FixUp | null
  /**
   * Focus the heading on mount: set it when the end screen replaces the
   * session in place (the focused control is gone), not on a page load.
   */
  focusTitle?: boolean
  /** The big result: stars, a band, a percentage. */
  headline: { icon?: ReactNode; unit?: string; value: ReactNode }
  /** The journey step just taken, e.g. "+1 on the trail, 2 to Camp". */
  journeyStep?: ReactNode
  module: AppModuleKey
  /** One `NextStopCard` (compact) or the one `ink` action. */
  nextStop: ReactNode
  /** Save state, e.g. a queued or failed notice. */
  notice?: ReactNode
  /** Quiet secondary links under the next stop. */
  secondary?: ReactNode
  /** The end screen's heading, e.g. "Lesson done!". */
  title: string
  titleId?: string
  /** What went right: accuracy, words moved, sentences written. */
  wins: ReactNode
}

/**
 * The end of every session, in a fixed order whatever order the props come
 * in (peak-end rule): what went right and the journey step first, then the
 * fix-up list (folded when long), then one next stop.
 */
export function SessionEnd({
  className,
  fixUp,
  focusTitle = false,
  headline,
  journeyStep,
  module,
  nextStop,
  notice,
  secondary,
  title,
  titleId = 'session-end-title',
  wins,
}: Props) {
  const theme = MODULE_THEMES[module]
  const visible = fixUp
    ? fixUp.items.length > FIX_UP_VISIBLE_LIMIT
      ? fixUp.items.slice(0, 1)
      : fixUp.items
    : []
  const folded =
    fixUp && fixUp.items.length > FIX_UP_VISIBLE_LIMIT
      ? fixUp.items.slice(1)
      : []

  return (
    <section
      aria-labelledby={titleId}
      className={cn('grid gap-4', className)}
      data-session-end={module}
    >
      <header
        className={cn(
          'border-line rounded-panel grid gap-3 border bg-linear-160 p-5 sm:p-6',
          theme.gradient
        )}
        data-session-slot="wins"
      >
        <h2
          className="font-sans text-2xl leading-tight font-medium tracking-tight focus:outline-none"
          id={titleId}
          tabIndex={focusTitle ? -1 : undefined}
        >
          {title}
        </h2>
        {focusTitle ? <FocusOnMount targetId={titleId} /> : null}
        <p className="flex flex-wrap items-baseline gap-x-2">
          {headline.icon ? (
            <span
              aria-hidden="true"
              className={cn('self-center [&_svg]:size-7', theme.accent)}
            >
              {headline.icon}
            </span>
          ) : null}
          <strong className="font-sans text-5xl leading-none font-light tracking-tight tabular-nums">
            {headline.value}
          </strong>
          {headline.unit ? (
            <span className="font-sans text-lg font-medium">
              {headline.unit}
            </span>
          ) : null}
        </p>
        <div className="text-sm">{wins}</div>
        {journeyStep ? (
          <div
            className={cn('text-sm font-medium', theme.accent)}
            data-session-slot="journey"
          >
            {journeyStep}
          </div>
        ) : null}
      </header>

      {notice ? <div data-session-slot="notice">{notice}</div> : null}

      {fixUp && fixUp.items.length > 0 ? (
        <section
          aria-label={fixUp.title}
          className="grid gap-2"
          data-session-slot="fixup"
        >
          <h3 className="font-sans text-base font-medium">{fixUp.title}</h3>
          <ul className="grid gap-2">
            {visible.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          {folded.length > 0 ? (
            // Native disclosure: no script needed for a long fix-up list.
            <details className="group grid gap-2">
              <summary className="soft-press hover-pop text-ink-soft rounded-control flex min-h-11 w-fit cursor-pointer list-none items-center gap-1.5 px-2 text-sm font-medium">
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-open:rotate-180"
                />
                {fixUp.moreLabel}
              </summary>
              <ul className="mt-2 grid gap-2">
                {folded.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <div
        className="grid gap-2"
        data-session-slot="next"
      >
        {nextStop}
        {secondary ? (
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            {secondary}
          </div>
        ) : null}
      </div>
    </section>
  )
}

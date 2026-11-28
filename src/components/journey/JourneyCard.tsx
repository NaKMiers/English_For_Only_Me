import type { ReactNode } from 'react'

import { MODULE_ICONS, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface Props {
  /** With `layout="aside"`: `sm` is a 17rem next stop column, `lg` 26rem. */
  asideWidth?: 'lg' | 'sm'
  className?: string
  /** The side drawer's handle, straddling the card's right edge. */
  handle?: ReactNode
  /** How far the learner came: a `JourneyHeadline`. */
  headline: ReactNode
  /**
   * `split` puts the next stop in a right column from `lg`; `aside` does the
   * same with a narrow fixed column (vocabulary, a small next stop); `stacked`
   * keeps one column with the next stop last.
   */
  layout?: 'aside' | 'split' | 'stacked'
  /** The module's own picture of the journey (staircase, trail, garden). */
  metaphor: ReactNode
  module: AppModuleKey
  /**
   * A `NextStopCard`. Left out on IELTS, where the floating Continue button
   * is the way on and the card saves the height.
   */
  nextStop?: ReactNode
  /**
   * Inside a `DrawerRow`: hide the next stop on wide screens while the side
   * card is open, so the narrower card keeps one column (vocabulary).
   */
  nextStopHidesWithDrawer?: boolean
  /**
   * A `StatStrip` of at most 4 chips, in the card's top right corner beside
   * the headline (it saves the height a chip row would take).
   */
  stats?: ReactNode
  /** The card's heading (visible small eyebrow with the module icon). */
  title: string
  titleId: string
}

/**
 * The top of every module landing: how far you came, the module's metaphor
 * (with the steps left written on it), a few numbers and at most one next
 * stop, on the module's
 * pastel gradient. Order is fixed here so every landing reads the same way.
 */
export function JourneyCard({
  asideWidth = 'sm',
  className,
  handle,
  headline,
  layout = 'split',
  metaphor,
  module,
  nextStop,
  nextStopHidesWithDrawer = false,
  stats,
  title,
  titleId,
}: Props) {
  const theme = MODULE_THEMES[module]
  const Icon = MODULE_ICONS[module]
  const statsOnTop = Boolean(stats)

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'border-line rounded-panel relative grid min-w-0 gap-5 border bg-linear-160 p-4 sm:p-6',
        theme.gradient,
        layout === 'split' &&
          nextStop &&
          'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-stretch',
        layout === 'aside' && nextStop && 'lg:items-stretch',
        layout === 'aside' &&
          nextStop &&
          (asideWidth === 'lg'
            ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]'
            : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,17rem)]'),
        nextStop &&
          nextStopHidesWithDrawer &&
          'lg:group-data-[drawer-open]/drawer:grid-cols-1',
        handle && 'pr-8 sm:pr-9',
        className
      )}
      data-journey-card={module}
    >
      {/* A named container: stat chips drop their labels when this column
          runs narrow (a wide next stop, an open side drawer). */}
      <div className="@container/journey grid min-w-0 content-between gap-5">
        <div
          className={cn(
            statsOnTop
              ? 'flex flex-wrap items-start justify-between gap-x-6 gap-y-3'
              : 'grid'
          )}
        >
          <div className="grid gap-1">
            <h2
              className={cn(
                'flex items-center gap-2 text-sm font-medium',
                theme.accent
              )}
              data-journey-slot="title"
              id={titleId}
            >
              {Icon ? (
                <Icon
                  aria-hidden="true"
                  className="size-4"
                />
              ) : null}
              {title}
            </h2>
            <div data-journey-slot="headline">{headline}</div>
          </div>
          {statsOnTop ? (
            <div
              className="min-w-0 sm:max-w-[70%]"
              data-journey-slot="stats"
            >
              {stats}
            </div>
          ) : null}
        </div>
        <div
          className="min-w-0"
          data-journey-slot="metaphor"
        >
          {metaphor}
        </div>
      </div>
      {nextStop ? (
        <div
          className={cn(
            'grid min-w-0',
            nextStopHidesWithDrawer &&
              'lg:group-data-[drawer-open]/drawer:hidden'
          )}
          data-journey-slot="next"
        >
          {nextStop}
        </div>
      ) : null}
      {handle}
    </section>
  )
}

interface HeadlineProps {
  /** Rendered icon in the module accent circle (optional). */
  icon?: ReactNode
  /** Small text after the unit, e.g. "of 120". */
  total?: string
  unit: string
  value: number | string
}

/** The big "42 lessons passed of 120" line, one size on every module. */
export function JourneyHeadline({ icon, total, unit, value }: HeadlineProps) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      {icon ? (
        <span
          aria-hidden="true"
          className="self-center [&_svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <strong className="font-sans text-5xl leading-none font-light tracking-tight tabular-nums sm:text-6xl">
        {value}
      </strong>
      <span className="font-sans text-xl font-medium">{unit}</span>
      {total ? <span className="text-ink-soft text-sm">{total}</span> : null}
    </p>
  )
}

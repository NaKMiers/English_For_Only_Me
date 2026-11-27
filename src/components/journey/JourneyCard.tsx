import type { ReactNode } from 'react'

import { MODULE_ICONS, type AppModuleKey } from '@/constants/modules'
import { MODULE_THEMES } from '@/constants/theme'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
  /** The side drawer's handle, straddling the card's right edge. */
  handle?: ReactNode
  /** How far the learner came: a `JourneyHeadline`. */
  headline: ReactNode
  /**
   * `split` puts the next stop in a right column from `lg`; `stacked` keeps
   * one column with the next stop last (IELTS, where height matters).
   */
  layout?: 'split' | 'stacked'
  /** The module's own picture of the journey (staircase, trail, garden). */
  metaphor: ReactNode
  /** The next milestone and the steps left to it: a `MilestoneNote`. */
  milestone?: ReactNode
  module: AppModuleKey
  /** A `NextStopCard`. */
  nextStop: ReactNode
  /** A `StatStrip` of at most 4 chips. */
  stats?: ReactNode
  /** The card's heading (visible small eyebrow with the module icon). */
  title: string
  titleId: string
}

/**
 * The top of every module landing: how far you came, the module's metaphor,
 * the next milestone, a few numbers and the one next stop, on the module's
 * pastel gradient. Order is fixed here so every landing reads the same way.
 */
export function JourneyCard({
  className,
  handle,
  headline,
  layout = 'split',
  metaphor,
  milestone,
  module,
  nextStop,
  stats,
  title,
  titleId,
}: Props) {
  const theme = MODULE_THEMES[module]
  const Icon = MODULE_ICONS[module]

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'border-line rounded-panel relative grid min-w-0 gap-5 border bg-linear-160 p-4 sm:p-6',
        theme.gradient,
        layout === 'split' &&
          'lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-stretch',
        handle && 'pr-8 sm:pr-9',
        className
      )}
      data-journey-card={module}
    >
      <div className="grid min-w-0 content-between gap-5">
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
        <div
          className="min-w-0"
          data-journey-slot="metaphor"
        >
          {metaphor}
        </div>
        {milestone || stats ? (
          <div className="grid gap-3">
            {milestone ? (
              <div data-journey-slot="milestone">{milestone}</div>
            ) : null}
            {stats ? <div data-journey-slot="stats">{stats}</div> : null}
          </div>
        ) : null}
      </div>
      <div
        className="grid min-w-0"
        data-journey-slot="next"
      >
        {nextStop}
      </div>
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

/** The "3 lessons to finish A2" line under the metaphor. */
export function MilestoneNote({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  /** A quiet hint on hover, e.g. how the milestones were chosen. */
  title?: string
}) {
  return (
    <p
      className={cn('text-sm font-medium', className)}
      title={title}
    >
      {children}
    </p>
  )
}

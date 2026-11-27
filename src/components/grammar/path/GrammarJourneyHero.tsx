'use client'

import {
  Check,
  CircleCheck,
  Dumbbell,
  Loader2,
  MapPin,
  Mountain,
  Play,
  RotateCcw,
  Star,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type {
  GrammarPathView,
  PathUnit,
} from '@/modules/grammar/path/buildGrammarPath'
import {
  currentLevel,
  levelProgress,
  type UnitSummary,
} from '@/modules/grammar/path/unitSummary'

interface Props {
  /** Review link for the first due lesson, or null with nothing due. */
  dueHref: string | null
  /** Where the next stop goes, or null once everything is done. */
  nextHref: string | null
  nextLabel: string
  nextSummary: UnitSummary | null
  nextUnit: PathUnit | null
  path: GrammarPathView
  syncing: boolean
}

/**
 * The top of the grammar page: the course as a staircase of CEFR levels.
 * Each step is a level, taller as it gets harder, and fills from the bottom
 * as its lessons are passed; the step being climbed wears the pin and the
 * lessons left to finish it are counted down. Beside it, the one next stop.
 * The winding path below shows the same journey lesson by lesson.
 */
export function GrammarJourneyHero({
  dueHref,
  nextHref,
  nextLabel,
  nextSummary,
  nextUnit,
  path,
  syncing,
}: Props) {
  const messages = useMessages()
  const t = messages.grammar.path
  const levels = levelProgress(path.units)
  const climbing = currentLevel(levels)
  const stats: {
    href?: string | null
    icon: LucideIcon
    iconClassName?: string
    label: string
    tone: string
    value: string
  }[] = [
    {
      icon: Star,
      iconClassName: 'fill-current',
      label: t.statStars,
      tone: 'bg-pastel-lemon text-accent-orange',
      value: `${path.totals.stars}/${path.totals.maxStars}`,
    },
    {
      icon: CircleCheck,
      label: t.statLessons,
      tone: 'bg-pastel-mint text-accent-green',
      value: `${path.totals.passedLessons}/${path.totals.totalLessons}`,
    },
    {
      href: dueHref,
      icon: RotateCcw,
      label: t.reviewDue,
      tone: 'bg-brand-soft text-brand-ink',
      value: String(path.totals.dueCount),
    },
    {
      href: path.totals.weakCount > 0 ? '/grammar/practice' : null,
      icon: Dumbbell,
      label: t.weakSpotsLabel,
      tone: 'bg-pastel-peach text-accent-orange',
      value: String(path.totals.weakCount),
    },
  ]

  return (
    <section
      aria-labelledby="grammar-journey-title"
      className="border-line rounded-panel from-pastel-lilac via-pastel-rose/30 to-surface grid gap-5 border bg-linear-160 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
    >
      <div className="grid min-w-0 content-between gap-6">
        <div className="grid gap-1">
          <h2
            className="text-accent-purple flex items-center gap-2 text-sm font-medium"
            id="grammar-journey-title"
          >
            <Mountain
              aria-hidden
              className="size-4"
            />
            {t.journeyTitle}
          </h2>
          <p className="flex flex-wrap items-baseline gap-x-2">
            <strong className="font-sans text-6xl leading-none font-light tracking-tight tabular-nums">
              {path.totals.passedLessons}
            </strong>
            <span className="font-sans text-xl font-medium">
              {t.lessonsPassed}
            </span>
            <span className="text-ink-soft text-sm">
              {format(t.ofTotal, { total: path.totals.totalLessons })}
            </span>
          </p>
          <p className="text-ink-soft text-sm">{t.journeyHint}</p>
        </div>

        {/* The staircase: one step per level, each taller than the last. */}
        <div className="grid gap-2">
          <ol className="flex h-44 items-end gap-1.5 sm:gap-2.5">
            {levels.map((row, index) => {
              const state =
                row.done >= row.total
                  ? 'done'
                  : row.level === climbing?.level
                    ? 'current'
                    : 'ahead'
              const percent =
                row.total > 0 ? Math.round((row.done / row.total) * 100) : 0
              const height = 34 + (66 * index) / Math.max(1, levels.length - 1)

              return (
                <li
                  aria-label={format(t.levelState[state], {
                    done: row.done,
                    level: row.level,
                    total: row.total,
                  })}
                  className="relative flex min-w-0 flex-1 flex-col justify-end"
                  key={row.level}
                  style={{ height: `${height}%` }}
                >
                  {state === 'current' ? (
                    <span
                      aria-hidden
                      className="bg-brand text-surface absolute -top-7 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-sm motion-safe:animate-bounce"
                    >
                      <MapPin className="size-3" />
                      <span className="hidden sm:inline">{t.youAreHere}</span>
                    </span>
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      'relative flex h-full flex-col justify-between overflow-hidden rounded-t-2xl rounded-b-md border-2 p-1.5 sm:p-2',
                      state === 'ahead'
                        ? 'bg-surface/60 border-line-strong border-dashed'
                        : 'bg-surface/85 border-accent-purple/40',
                      state === 'current' && 'ring-brand/30 ring-4'
                    )}
                  >
                    {/* The fill rises with the level's passed lessons. */}
                    <span
                      className="bg-accent-purple/85 motion-grow-y absolute inset-x-0 bottom-0 origin-bottom"
                      style={{ height: `${percent}%` }}
                    />
                    <span
                      className={cn(
                        'relative flex items-center justify-between gap-1 font-sans text-sm font-semibold',
                        percent >= 85 ? 'text-surface' : 'text-ink'
                      )}
                    >
                      {row.level}
                      {state === 'done' ? (
                        <Check className="size-3.5 stroke-3" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        'relative text-[10px] tabular-nums sm:text-[11px]',
                        percent >= 15 ? 'text-surface' : 'text-ink-soft'
                      )}
                    >
                      {row.done}/{row.total}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="text-sm font-medium">
            {climbing
              ? plural(t.toFinishLevel, climbing.total - climbing.done, {
                  level: climbing.level,
                })
              : t.allClimbed}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(item => {
            const Icon = item.icon
            const body = (
              <>
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-full',
                    item.tone
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn('size-4', item.iconClassName)}
                  />
                </span>
                <span className="grid min-w-0">
                  <dt className="text-ink-soft truncate text-[11px]">
                    {item.label}
                  </dt>
                  <dd className="font-sans text-lg leading-tight font-medium tabular-nums">
                    {item.value}
                  </dd>
                </span>
              </>
            )

            return item.href ? (
              <Link
                className="soft-press hover-pop bg-surface/80 hover:bg-surface flex items-center gap-2.5 rounded-2xl p-2.5"
                href={item.href}
                key={item.label}
              >
                {body}
              </Link>
            ) : (
              <div
                className="bg-surface/80 flex items-center gap-2.5 rounded-2xl p-2.5"
                key={item.label}
              >
                {body}
              </div>
            )
          })}
        </dl>
      </div>

      {/* Next stop: where the learner is and the one action to take. */}
      <section
        aria-label={t.continue}
        className="bg-surface shadow-card grid min-w-0 content-between gap-5 rounded-[24px] p-5"
      >
        <span className="bg-brand-soft text-brand-ink inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium">
          <MapPin
            aria-hidden
            className="size-3.5"
          />
          {t.nextStop}
        </span>
        <div className="grid gap-2">
          {nextUnit ? (
            <p className="text-ink-soft truncate text-sm">
              {format(messages.grammar.unitLevel, {
                level: nextUnit.level,
                order: nextUnit.order,
              })}{' '}
              · {nextUnit.title}
            </p>
          ) : null}
          <h2 className="font-sans text-2xl leading-tight font-medium tracking-tight">
            {nextLabel}
          </h2>
          {nextSummary ? (
            <div className="flex items-center gap-3">
              <div
                aria-label={format(t.unitProgress, {
                  done: nextSummary.done,
                  total: nextSummary.total,
                })}
                className="bg-tint h-2 flex-1 overflow-hidden rounded-full"
                role="img"
              >
                <div
                  className="bg-accent-purple motion-grow-x h-full rounded-full"
                  style={{ width: `${nextSummary.percent}%` }}
                />
              </div>
              <span className="text-ink-soft text-xs tabular-nums">
                {nextSummary.done}/{nextSummary.total}
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {nextHref ? (
            <ActionButton
              href={nextHref}
              icon={
                <Play
                  aria-hidden
                  className="fill-current"
                />
              }
              tone="ink"
            >
              {path.next.kind === 'lesson' ? t.startLesson : t.go}
            </ActionButton>
          ) : null}
          {syncing ? (
            <p
              aria-live="polite"
              className="text-ink-soft flex items-center gap-2 text-sm"
            >
              <Loader2
                aria-hidden
                className="size-4 motion-safe:animate-spin"
              />
              {t.syncing}
            </p>
          ) : null}
        </div>
      </section>
    </section>
  )
}

'use client'

import {
  Check,
  CircleCheck,
  Dumbbell,
  Loader2,
  MapPin,
  Star,
  type LucideIcon,
} from 'lucide-react'

import { JourneyCard, JourneyHeadline } from '@/components/journey/JourneyCard'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { DUE_ICON } from '@/constants/stateIcons'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { GrammarPathView } from '@/modules/grammar/path/buildGrammarPath'
import { currentLevel, levelProgress } from '@/modules/grammar/path/unitSummary'

interface Props {
  /** Review link for the first due lesson, or null with nothing due. */
  dueHref: string | null
  path: GrammarPathView
  syncing: boolean
}

type LevelState = 'ahead' | 'current' | 'done'

/**
 * The top of the grammar page on the shared `JourneyCard`, kept short: the
 * course as a staircase of CEFR levels. Each step is a level, taller as it
 * gets harder, and fills from the bottom as its lessons are passed. A flag
 * rides on top of every step, climbing with the stairs: a tick once the
 * level is done, the pink "you are here" pin with the lessons still to go on
 * the step being climbed, and the lessons to go on the steps ahead. The
 * chips sit top right; no next stop card, the page's floating Continue
 * button scrolls to the next lesson on the winding path below.
 */
export function GrammarJourneyHero({ dueHref, path, syncing }: Props) {
  const messages = useMessages()
  const t = messages.grammar.path
  const levels = levelProgress(path.units)
  const climbing = currentLevel(levels)
  const stats: {
    href?: string | null
    icon: LucideIcon
    iconClassName?: string
    label: string
    value: string
  }[] = [
    {
      icon: Star,
      iconClassName: 'fill-current',
      label: t.statStars,
      value: `${path.totals.stars}/${path.totals.maxStars}`,
    },
    {
      icon: CircleCheck,
      label: t.statLessons,
      value: `${path.totals.passedLessons}/${path.totals.totalLessons}`,
    },
    {
      href: dueHref,
      icon: DUE_ICON,
      label: t.reviewDue,
      value: String(path.totals.dueCount),
    },
    {
      href: path.totals.weakCount > 0 ? '/grammar/practice' : null,
      icon: Dumbbell,
      label: t.weakSpotsLabel,
      value: String(path.totals.weakCount),
    },
  ]

  return (
    <JourneyCard
      headline={
        <div className="grid gap-1">
          <JourneyHeadline
            total={format(t.ofTotal, { total: path.totals.totalLessons })}
            unit={plural(t.lessonsPassed, path.totals.passedLessons)}
            value={path.totals.passedLessons}
          />
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
      }
      metaphor={
        // The staircase: one step per level, each taller than the last, with
        // its flag on top.
        <ol className="flex h-36 items-end gap-1.5 pt-7 sm:h-28 sm:gap-2.5">
          {levels.map((row, index) => {
            const state: LevelState =
              row.done >= row.total
                ? 'done'
                : row.level === climbing?.level
                  ? 'current'
                  : 'ahead'
            const left = row.total - row.done
            const percent =
              row.total > 0 ? Math.round((row.done / row.total) * 100) : 0
            // The lowest step stays tall enough for the level and count to
            // wrap onto two lines on a phone's narrow columns.
            const height = 44 + (56 * index) / Math.max(1, levels.length - 1)
            const toGo = plural(t.toFinishLevel, left, { level: row.level })

            return (
              <li
                aria-label={format(t.levelState[state], {
                  done: row.done,
                  level: row.level,
                  total: row.total,
                })}
                className="relative flex min-w-0 flex-1 flex-col justify-end"
                data-level-state={state}
                key={row.level}
                style={{ height: `${height}%` }}
                title={state === 'done' ? undefined : toGo}
              >
                <LevelFlag
                  label={plural(t.lessonsToGo, left)}
                  state={state}
                  youAreHere={messages.common.journey.youAreHere}
                />
                <span
                  aria-hidden
                  className={cn(
                    'rounded-t-control rounded-b-tag relative h-full overflow-hidden border-2 p-1.5 sm:px-2',
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
                  {/* Level and count share the top row, so a short step
                      never hides one under the other. */}
                  <span
                    className={cn(
                      'relative flex flex-wrap items-baseline justify-between gap-x-1',
                      percent >= 85 ? 'text-surface' : 'text-ink'
                    )}
                  >
                    <span className="font-sans text-sm font-medium">
                      {row.level}
                    </span>
                    <span
                      className={cn(
                        'text-xs tabular-nums',
                        percent < 85 && 'text-ink-soft'
                      )}
                    >
                      {row.done}/{row.total}
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      }
      module="grammar"
      stats={
        <StatStrip className="sm:justify-end">
          {stats.map(item => (
            <StatChip
              href={item.href}
              icon={item.icon}
              iconClassName={item.iconClassName}
              key={item.label}
              label={item.label}
              tone="grammar"
              value={item.value}
            />
          ))}
        </StatStrip>
      }
      statsPlacement="top"
      title={t.journeyTitle}
      titleId="grammar-journey-title"
    />
  )
}

/**
 * The flag on top of one step: a tick when the level is done, the bouncing
 * pink pin with the lessons to go on the step being climbed, a quiet "N to
 * go" on the steps ahead. Plain text and pills, no lines, so the steps keep
 * the eye.
 */
function LevelFlag({
  label,
  state,
  youAreHere,
}: {
  label: string
  state: LevelState
  youAreHere: string
}) {
  if (state === 'done')
    return (
      <span
        aria-hidden
        className="bg-accent-purple text-surface absolute -top-6 left-1/2 grid size-5 -translate-x-1/2 place-items-center rounded-full shadow-sm"
      >
        <Check className="size-3 stroke-3" />
      </span>
    )

  if (state === 'current')
    return (
      <span
        aria-hidden
        className="bg-brand text-surface absolute -top-7 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm motion-safe:animate-bounce"
        title={youAreHere}
      >
        <MapPin className="size-3 shrink-0" />
        <span className="tabular-nums">{label}</span>
      </span>
    )

  return (
    <span
      aria-hidden
      className="text-ink-soft absolute -top-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap tabular-nums"
    >
      {label}
    </span>
  )
}

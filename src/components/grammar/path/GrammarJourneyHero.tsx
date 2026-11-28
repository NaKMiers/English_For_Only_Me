'use client'

import {
  Check,
  CircleCheck,
  Dumbbell,
  Loader2,
  MapPin,
  Play,
  RotateCcw,
  Star,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { Progress } from '@/components/ui/progress'
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
 * The top of the grammar page on the shared `JourneyCard`: the course as a
 * staircase of CEFR levels. Each step is a level, taller as it gets harder,
 * and fills from the bottom as its lessons are passed; the step being
 * climbed wears the pin and the lessons left to finish it are counted down.
 * Beside it, the one next stop. The winding path below shows the same
 * journey lesson by lesson.
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
      icon: RotateCcw,
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
        <JourneyHeadline
          total={format(t.ofTotal, { total: path.totals.totalLessons })}
          unit={plural(t.lessonsPassed, path.totals.passedLessons)}
          value={path.totals.passedLessons}
        />
      }
      metaphor={
        // The staircase: one step per level, each taller than the last.
        <ol className="flex h-44 items-end gap-1.5 pt-7 sm:gap-2.5">
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
                    className="bg-brand text-surface absolute -top-7 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap shadow-sm motion-safe:animate-bounce"
                  >
                    <MapPin className="size-3" />
                    <span className="hidden sm:inline">
                      {messages.common.journey.youAreHere}
                    </span>
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className={cn(
                    'rounded-t-control rounded-b-tag relative flex h-full flex-col justify-between overflow-hidden border-2 p-1.5 sm:p-2',
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
                      'relative flex items-center justify-between gap-1 font-sans text-sm font-medium',
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
                      'relative text-xs tabular-nums',
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
      }
      milestone={
        <MilestoneNote>
          {climbing
            ? plural(t.toFinishLevel, climbing.total - climbing.done, {
                level: climbing.level,
              })
            : t.allClimbed}
        </MilestoneNote>
      }
      module="grammar"
      nextStop={
        <NextStopCard
          actionIcon={
            <Play
              aria-hidden
              className="fill-current"
            />
          }
          actionLabel={path.next.kind === 'lesson' ? t.startLesson : t.go}
          detail={
            nextUnit
              ? `${format(messages.grammar.unitLevel, {
                  level: nextUnit.level,
                  order: nextUnit.order,
                })} · ${nextUnit.title}`
              : undefined
          }
          done={
            nextHref
              ? undefined
              : {
                  icon: (
                    <Trophy
                      aria-hidden
                      className="text-accent-purple"
                    />
                  ),
                  text: nextLabel,
                }
          }
          footer={
            syncing ? (
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
            ) : null
          }
          href={nextHref}
          pinLabel={messages.common.journey.nextStop}
          title={nextLabel}
        >
          {nextSummary ? (
            <div className="flex items-center gap-3">
              <Progress
                aria-label={format(t.unitProgress, {
                  done: nextSummary.done,
                  total: nextSummary.total,
                })}
                className="flex-1"
                tone="grammar"
                trackClassName="h-2"
                value={nextSummary.percent}
              />
              <span className="text-ink-soft text-xs tabular-nums">
                {nextSummary.done}/{nextSummary.total}
              </span>
            </div>
          ) : null}
        </NextStopCard>
      }
      stats={
        <StatStrip>
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
      title={t.journeyTitle}
      titleId="grammar-journey-title"
    />
  )
}

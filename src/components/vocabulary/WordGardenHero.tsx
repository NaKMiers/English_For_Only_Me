'use client'

import {
  Bean,
  BookOpen,
  BookOpenCheck,
  Flame,
  Leaf,
  Shrub,
  Sprout,
  TreeDeciduous,
  TreePine,
  Trees,
  type LucideIcon,
} from 'lucide-react'

import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { DrawerHandle } from '@/components/journey/SideDrawer'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import {
  WORD_STAGES,
  wordGardenPosition,
  type WordStageKey,
} from './wordGarden'

const STAGE_ICONS: Record<WordStageKey, LucideIcon> = {
  seed: Bean,
  sprout: Sprout,
  sapling: Leaf,
  youngTree: Shrub,
  tree: TreeDeciduous,
  grove: TreePine,
  forest: Trees,
}

/** What the next stop offers: due recall cards, or new words to plant. */
export type GardenNextStop =
  | { kind: 'due'; due: number; nextTerm: string; onStart: () => void }
  | { kind: 'plant'; href: string }

interface Props {
  next: GardenNextStop
  stats: VocabStatsRecord
  /** Adds the side drawer handle ("How a word grows"). */
  withDrawer?: boolean
}

/**
 * The top of the vocabulary page on the shared `JourneyCard`: the learner's
 * words as a garden that grows through seven stages, each tied to a rough
 * CEFR vocabulary size, with the next stage always named and counted down.
 * The next stop is the recall session when words are due, else planting new
 * words. How a word grows (the word-list views) sits in the side drawer.
 */
export function WordGardenHero({ next, stats, withDrawer = false }: Props) {
  const messages = useMessages()
  const { garden: t, launcher } = messages.vocabulary
  const locale = useLocale()
  const known = stats.totalKnownCount
  const position = wordGardenPosition(known)
  const stage = WORD_STAGES[position.index]
  const nextStage = WORD_STAGES[position.index + 1]
  const StageIcon = STAGE_ICONS[stage.key]
  const stageName = (item: (typeof WORD_STAGES)[number]) =>
    item.level
      ? `${t.stages[item.key]} (${format(t.levelAbout, { level: item.level })})`
      : t.stages[item.key]
  // The vine runs from the first node's centre to the last one's.
  const fill =
    ((position.index + (nextStage ? position.progress : 0)) /
      (WORD_STAGES.length - 1)) *
    100
  const chips = [
    { icon: Sprout, label: t.learnedToday, value: stats.learnedTodayCount },
    {
      icon: BookOpenCheck,
      label: t.reviewsToday,
      value: stats.reviewsTodayCount,
    },
    { icon: Flame, label: t.streak, value: stats.activeStreakDays },
  ]

  return (
    <JourneyCard
      handle={
        withDrawer ? (
          <DrawerHandle
            accentClassName="text-accent-green"
            hideLabel={t.hideSide}
            showLabel={t.showSide}
          />
        ) : undefined
      }
      headline={
        <div className="flex flex-wrap items-end justify-between gap-3">
          <JourneyHeadline
            unit={t.words}
            value={known.toLocaleString(INTL_LOCALES[locale])}
          />
          <span className="bg-surface/85 rounded-control flex items-center gap-3 py-2 pr-4 pl-2 shadow-sm">
            <span className="bg-accent-green text-surface rounded-control grid size-11 place-items-center">
              <StageIcon
                aria-hidden="true"
                className="size-6"
              />
            </span>
            <span className="grid">
              <strong className="font-sans text-base font-medium">
                {t.stages[stage.key]}
              </strong>
              <span className="text-ink-soft text-xs">
                {stage.level
                  ? format(t.levelAbout, { level: stage.level })
                  : '-'}
              </span>
            </span>
          </span>
        </div>
      }
      metaphor={
        // The growth path: seven stages on one vine.
        <ol className="relative grid grid-cols-7">
          <span
            aria-hidden="true"
            className="bg-surface/80 absolute top-[26px] right-[calc(100%/14)] left-[calc(100%/14)] h-1 rounded-full"
          >
            <span
              className="bg-accent-green motion-grow-x block h-full rounded-full"
              style={{ width: `${fill}%` }}
            />
          </span>
          {WORD_STAGES.map((item, index) => {
            const Icon = STAGE_ICONS[item.key]
            const state =
              index < position.index
                ? 'reached'
                : index === position.index
                  ? 'current'
                  : 'ahead'

            return (
              <li
                aria-label={format(t.stageState[state], {
                  count: Math.max(0, item.at - known),
                  stage: stageName(item),
                })}
                className="relative grid min-w-0 justify-items-center gap-1"
                key={item.key}
              >
                <span className="grid h-14 place-items-center">
                  <span
                    className={cn(
                      'grid place-items-center rounded-full border-2',
                      state === 'current'
                        ? 'bg-accent-green text-surface border-surface ring-accent-green/30 size-14 ring-4'
                        : state === 'reached'
                          ? 'bg-accent-green text-surface border-surface size-10'
                          : 'bg-surface text-ink-soft border-line-strong size-10 border-dashed'
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={state === 'current' ? 'size-6' : 'size-4'}
                    />
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'hidden max-w-full truncate text-xs sm:block',
                    state === 'ahead' ? 'text-ink-soft' : 'font-medium'
                  )}
                >
                  {t.stages[item.key]}
                </span>
                <span
                  aria-hidden="true"
                  className="text-ink-soft text-xs tabular-nums"
                >
                  {item.level ?? '0'}
                </span>
              </li>
            )
          })}
        </ol>
      }
      milestone={
        <MilestoneNote title={t.guide}>
          {nextStage
            ? plural(t.toNext, position.left, { stage: stageName(nextStage) })
            : t.forest}
        </MilestoneNote>
      }
      module="vocabulary"
      nextStop={
        next.kind === 'due' ? (
          <NextStopCard
            actionIcon={<BookOpen aria-hidden="true" />}
            actionLabel={launcher.start}
            detail={format(launcher.next, { term: next.nextTerm })}
            href={null}
            onAction={next.onStart}
            pinLabel={messages.common.journey.nextStop}
            title={plural(t.dueTitle, next.due)}
          />
        ) : (
          <NextStopCard
            actionIcon={<Sprout aria-hidden="true" />}
            actionLabel={t.plantAction}
            detail={t.plantDetail}
            href={next.href}
            pinLabel={messages.common.journey.nextStop}
            title={t.plantTitle}
          />
        )
      }
      stats={
        <StatStrip>
          {chips.map(chip => (
            <StatChip
              icon={chip.icon}
              key={chip.label}
              label={`${t.today} · ${chip.label}`}
              tone="vocabulary"
              value={String(chip.value)}
            />
          ))}
        </StatStrip>
      }
      title={t.title}
      titleId="word-garden-title"
    />
  )
}

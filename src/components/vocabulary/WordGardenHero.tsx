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

import { JourneyCard, JourneyHeadline } from '@/components/journey/JourneyCard'
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

/** The next stop: the due recall cards (it opens the session on this page). */
export interface GardenNextStop {
  due: number
  nextTerm: string
  onStart: () => void
}

interface Props {
  /**
   * Null with nothing due: no next stop card (a card that only scrolled to
   * the explore deck was a dead step); the page's Continue float points at
   * the deck instead.
   */
  next: GardenNextStop | null
  stats: VocabStatsRecord
  /** Adds the side drawer handle ("How a word grows"). */
  withDrawer?: boolean
}

/**
 * The top of the vocabulary page on the shared `JourneyCard`, kept short:
 * the learner's words as a garden that grows through seven stages on one
 * vine, each tied to a rough CEFR vocabulary size. Above the vine, between
 * each pair of stages still ahead, the words to go (plain text, no lines);
 * the chips sit top right. The next stop, a small card in a narrow right
 * column, is the recall session when words are due; with nothing due
 * there is none (the Continue float leads to the explore deck). How a word grows (the word-list views) sits in the side drawer.
 */
export function WordGardenHero({ next, stats, withDrawer = false }: Props) {
  const messages = useMessages()
  const { garden: t, launcher } = messages.vocabulary
  const locale = useLocale()
  const known = stats.totalKnownCount
  const position = wordGardenPosition(known)
  const nextStage = WORD_STAGES[position.index + 1]
  const number = (value: number) => value.toLocaleString(INTL_LOCALES[locale])
  // The words to go between each pair of stages not yet passed.
  const segments = WORD_STAGES.slice(1).flatMap((item, index) =>
    index < position.index
      ? []
      : [
          {
            current: index === position.index,
            index,
            left:
              index === position.index
                ? position.left
                : item.at - WORD_STAGES[index].at,
            stage: item,
          },
        ]
  )
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
        <JourneyHeadline
          unit={plural(t.words, known)}
          value={number(known)}
        />
      }
      metaphor={
        // The growth path: seven stages on one vine, the words to go
        // written above each stage still ahead.
        <div
          className="relative pt-5"
          title={t.guide}
        >
          <ul aria-label={t.stagesLabel}>
            {segments.map(segment => (
              <li
                className={cn(
                  'absolute top-0 -translate-x-1/2 text-xs whitespace-nowrap tabular-nums',
                  segment.current
                    ? 'text-accent-green font-medium'
                    : 'text-ink-soft'
                )}
                data-garden-segment={segment.current ? 'current' : 'ahead'}
                key={segment.stage.key}
                style={{
                  left: `${((segment.index + 1) / WORD_STAGES.length) * 100}%`,
                }}
              >
                <span className="sr-only">
                  {plural(t.toNext, segment.left, {
                    count: number(segment.left),
                    stage: stageName(segment.stage),
                  })}
                </span>
                <span
                  aria-hidden="true"
                  className="sm:hidden"
                >
                  {number(segment.left)}
                </span>
                <span
                  aria-hidden="true"
                  className="max-sm:hidden"
                >
                  {plural(t.wordsToGo, segment.left, {
                    count: number(segment.left),
                  })}
                </span>
              </li>
            ))}
          </ul>
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
        </div>
      }
      layout="aside"
      module="vocabulary"
      nextStopHidesWithDrawer
      nextStop={
        next ? (
          <NextStopCard
            actionIcon={<BookOpen aria-hidden="true" />}
            actionLabel={launcher.start}
            detail={format(launcher.next, { term: next.nextTerm })}
            href={null}
            onAction={next.onStart}
            pinLabel={messages.common.journey.nextStop}
            size="sm"
            title={plural(t.dueTitle, next.due)}
          />
        ) : undefined
      }
      stats={
        <StatStrip className="sm:justify-end">
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
      statsPlacement="top"
      title={t.title}
      titleId="word-garden-title"
    />
  )
}

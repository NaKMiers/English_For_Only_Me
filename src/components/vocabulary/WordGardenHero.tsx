'use client'

import {
  Bean,
  BookCheck,
  BookOpenCheck,
  ChevronDown,
  Flame,
  Flower2,
  Leaf,
  RotateCcw,
  Shrub,
  Sprout,
  TreeDeciduous,
  TreePine,
  Trees,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { vocabStatusLinks } from './VocabularyStatsOverview'
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

/** Icon and tint per word-list view, in vocabStatusLinks order. */
const FLOW_STYLES: { icon: LucideIcon; tone: string }[] = [
  { icon: Sprout, tone: 'bg-pastel-sky text-accent-blue' },
  { icon: RotateCcw, tone: 'bg-brand-soft text-brand-ink' },
  { icon: BookCheck, tone: 'bg-pastel-peach text-accent-orange' },
  { icon: Flower2, tone: 'bg-pastel-lilac text-accent-purple' },
  { icon: Leaf, tone: 'bg-pastel-mint text-accent-green' },
]

type FlowItem = ReturnType<typeof vocabStatusLinks>[number] &
  (typeof FLOW_STYLES)[number]

function FlowLink({ item }: { item: FlowItem }) {
  const Icon = item.icon

  return (
    <Link
      className="soft-press hover-pop hover:bg-tint-soft flex items-center gap-3 rounded-2xl px-2 py-2"
      href={item.href}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-full',
          item.tone
        )}
      >
        <Icon
          aria-hidden="true"
          className="size-[18px]"
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {item.label}
      </span>
      <strong className="font-sans text-xl font-medium tabular-nums">
        {item.value}
      </strong>
    </Link>
  )
}

interface Props {
  stats: VocabStatsRecord
}

/**
 * The top of the vocabulary page: the learner's words as a garden that grows
 * through seven stages, each tied to a rough CEFR vocabulary size, with the
 * next stage always named and counted down. Beside it, how a word grows
 * (learning, due, mastered) as links into the word list, and today's work.
 */
export function WordGardenHero({ stats }: Props) {
  const { garden: t, views } = useMessages().vocabulary
  const locale = useLocale()
  const known = stats.totalKnownCount
  const position = wordGardenPosition(known)
  const stage = WORD_STAGES[position.index]
  const next = WORD_STAGES[position.index + 1]
  const StageIcon = STAGE_ICONS[stage.key]
  const stageName = (item: (typeof WORD_STAGES)[number]) =>
    item.level
      ? `${t.stages[item.key]} (${format(t.levelAbout, { level: item.level })})`
      : t.stages[item.key]
  // The vine runs from the first node's centre to the last one's.
  const fill =
    ((position.index + (next ? position.progress : 0)) /
      (WORD_STAGES.length - 1)) *
    100
  const links = vocabStatusLinks(stats, views).map((item, index) => ({
    ...item,
    ...FLOW_STYLES[index],
  }))
  // A word's own path (learning, due, mastered), then the two totals.
  const flow = [links[0], links[1], links[3]]
  const totals = [links[2], links[4]]
  const today = [
    { icon: Sprout, label: t.learnedToday, value: stats.learnedTodayCount },
    {
      icon: BookOpenCheck,
      label: t.reviewsToday,
      value: stats.reviewsTodayCount,
    },
    { icon: Flame, label: t.streak, value: stats.activeStreakDays },
  ]

  return (
    <section
      aria-labelledby="word-garden-title"
      className="border-line rounded-panel from-pastel-mint via-pastel-lemon/40 to-surface grid gap-5 border bg-linear-160 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
    >
      <div className="grid min-w-0 content-between gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-1">
            <h2
              className="text-accent-green flex items-center gap-2 text-sm font-medium"
              id="word-garden-title"
            >
              <Sprout
                aria-hidden="true"
                className="size-4"
              />
              {t.title}
            </h2>
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-sans text-6xl leading-none font-light tracking-tight tabular-nums">
                {known.toLocaleString(INTL_LOCALES[locale])}
              </strong>
              <span className="font-sans text-xl font-medium">{t.words}</span>
            </p>
            <p className="text-ink-soft text-sm">{t.hint}</p>
          </div>
          <span className="bg-surface/85 flex items-center gap-3 rounded-[22px] py-2 pr-4 pl-2 shadow-sm">
            <span className="bg-accent-green text-surface grid size-12 place-items-center rounded-2xl">
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

        {/* The growth path: seven stages on one vine. */}
        <div className="grid gap-2">
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
                      'hidden max-w-full truncate text-[11px] sm:block',
                      state === 'ahead' ? 'text-ink-soft' : 'font-medium'
                    )}
                  >
                    {t.stages[item.key]}
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-ink-soft text-[10px] tabular-nums"
                  >
                    {item.level ?? '0'}
                  </span>
                </li>
              )
            })}
          </ol>
          <p className="text-sm font-medium">
            {next
              ? plural(t.toNext, position.left, { stage: stageName(next) })
              : t.forest}
          </p>
          <p className="text-ink-soft text-[11px]">{t.guide}</p>
        </div>

        <dl className="grid grid-cols-3 gap-2">
          {today.map(item => {
            const Icon = item.icon

            return (
              <div
                className="bg-surface/80 flex items-center gap-2.5 rounded-2xl p-2.5"
                key={item.label}
              >
                <Icon
                  aria-hidden="true"
                  className="text-accent-green size-5 shrink-0"
                />
                <span className="grid min-w-0">
                  <dt className="text-ink-soft truncate text-[11px]">
                    {t.today} · {item.label}
                  </dt>
                  <dd className="font-sans text-lg leading-tight font-medium tabular-nums">
                    {item.value}
                  </dd>
                </span>
              </div>
            )
          })}
        </dl>
      </div>

      {/* How a word grows: learning -> due -> mastered, then the totals. */}
      <nav
        aria-labelledby="word-flow-title"
        className="bg-surface shadow-card grid min-w-0 content-start gap-2 rounded-[24px] p-4"
      >
        <h3
          className="px-1 font-sans text-base font-medium"
          id="word-flow-title"
        >
          {t.flowTitle}
        </h3>
        <ol className="grid">
          {flow.map((item, index) => (
            <li key={item.href}>
              <FlowLink item={item} />
              {index < flow.length - 1 ? (
                <ChevronDown
                  aria-hidden="true"
                  className="text-ink-soft/60 ml-5 size-4"
                />
              ) : null}
            </li>
          ))}
        </ol>
        <ul className="border-line grid gap-1 border-t pt-2">
          {totals.map(item => (
            <li key={item.href}>
              <FlowLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}

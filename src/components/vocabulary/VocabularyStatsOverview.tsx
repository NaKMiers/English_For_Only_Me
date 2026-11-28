'use client'

import {
  BookCheck,
  ChevronDown,
  Flower2,
  Leaf,
  Sprout,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { DUE_ICON } from '@/constants/stateIcons'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

interface Props {
  className?: string
  stats: VocabStatsRecord
}

/** Icon per word-list view, in vocabStatusLinks order. */
const FLOW_ICONS: LucideIcon[] = [Sprout, DUE_ICON, BookCheck, Flower2, Leaf]

function FlowLink({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string
  icon: LucideIcon
  label: string
  value: number
}) {
  return (
    <Link
      className="soft-press hover-pop hover:bg-tint-soft rounded-control flex min-h-11 items-center gap-3 px-2 py-1.5"
      href={href}
    >
      <span className="bg-pastel-mint text-accent-green grid size-9 shrink-0 place-items-center rounded-full">
        <Icon
          aria-hidden="true"
          className="size-4"
        />
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {label}
      </span>
      <strong className="font-sans text-lg font-medium tabular-nums">
        {value}
      </strong>
    </Link>
  )
}

/** The word-list views, in the order a learner moves words through them. */
export function vocabStatusLinks(
  stats: VocabStatsRecord,
  views: Messages['vocabulary']['views']
) {
  return [
    {
      dot: 'bg-accent-blue',
      href: '/vocabulary/words?view=learning',
      label: views.learning,
      value: stats.learningCount,
    },
    {
      dot: 'bg-brand',
      href: '/vocabulary/words?view=dueToday',
      label: views.dueToday,
      value: stats.dueTodayCount,
    },
    {
      dot: 'bg-accent-orange',
      href: '/vocabulary/words?view=alreadyKnow',
      label: views.alreadyKnow,
      value: stats.alreadyKnowCount,
    },
    {
      dot: 'bg-accent-purple',
      href: '/vocabulary/words?view=mastered',
      label: views.mastered,
      value: stats.masteredCount,
    },
    {
      dot: 'bg-accent-green',
      href: '/vocabulary/words?view=knownTotal',
      label: views.knownTotal,
      value: stats.totalKnownCount,
    },
  ]
}

/**
 * The vocabulary drawer: how a word grows (learning, due, mastered, then the
 * two totals) as links into the word list, the last two weeks of growth and
 * the hardest words. Folded behind the garden card's handle.
 */
export function VocabularyStatsOverview({ className, stats }: Props) {
  const messages = useMessages()
  const { stats: t, garden, views } = messages.vocabulary
  const maxGrowth = Math.max(1, ...stats.dailyGrowth.map(point => point.count))
  const progress =
    stats.totalStartedCount === 0
      ? 0
      : Math.round((stats.totalKnownCount / stats.totalStartedCount) * 100)
  const links = vocabStatusLinks(stats, views).map((item, index) => ({
    ...item,
    icon: FLOW_ICONS[index] ?? Leaf,
  }))
  // A word's own path (learning, due, mastered), then the two totals.
  const flow = [links[0], links[1], links[3]]
  const totals = [links[2], links[4]]

  return (
    <div
      className={cn(
        'border-line bg-surface rounded-panel grid min-w-0 content-start gap-4 overflow-y-auto overscroll-contain border p-3 sm:p-4',
        className
      )}
    >
      <nav
        aria-labelledby="word-flow-title"
        className="grid gap-1"
      >
        <h2
          className="px-2 text-sm font-medium"
          id="word-flow-title"
        >
          {garden.flowTitle}
        </h2>
        <ol className="grid">
          {flow.map((item, index) => (
            <li key={item.href}>
              <FlowLink {...item} />
              {index < flow.length - 1 ? (
                <ChevronDown
                  aria-hidden="true"
                  className="text-ink-soft/60 ml-5 size-4"
                />
              ) : null}
            </li>
          ))}
        </ol>
        <ul className="border-line grid gap-1 border-t pt-1">
          {totals.map(item => (
            <li key={item.href}>
              <FlowLink {...item} />
            </li>
          ))}
        </ul>
      </nav>

      <section
        aria-labelledby="vocab-growth-title"
        className="grid content-start gap-3 px-2"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            className="text-sm font-medium"
            id="vocab-growth-title"
          >
            {t.growthTitle}
          </h2>
          <span className="text-ink-soft text-xs tabular-nums">
            {format(t.knownShare, { percent: progress })}
          </span>
        </div>
        <div className="grid h-20 grid-cols-14 items-end gap-1">
          {stats.dailyGrowth.map(point => (
            <div
              className="grid h-full min-w-0 content-end"
              key={point.label}
              title={`${point.label}: ${point.count}`}
            >
              <div
                className={cn(
                  'motion-grow-y rounded-tag min-h-1',
                  point.count > 0 ? 'bg-accent-green' : 'bg-tint'
                )}
                style={{
                  height: `${Math.max(4, (point.count / maxGrowth) * 72)}px`,
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="vocab-hardest-title"
        className="grid content-start gap-2 px-2"
      >
        <h2
          className="text-sm font-medium"
          id="vocab-hardest-title"
        >
          {t.hardestTitle}
        </h2>
        {stats.hardestWords.length > 0 ? (
          <ul className="grid gap-1">
            {stats.hardestWords.slice(0, 5).map(word => (
              <li
                className="flex items-center justify-between gap-2 text-sm"
                key={word.vocabEntryId}
              >
                <span className="truncate font-medium">{word.term}</span>
                <span className="text-ink-soft shrink-0 text-xs tabular-nums">
                  {plural(t.misses, word.wrongCount, {
                    percent: word.accuracyPercent,
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft text-xs leading-5">{t.noHardWords}</p>
        )}
      </section>
    </div>
  )
}

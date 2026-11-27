'use client'

import Link from 'next/link'

import { cn } from '@/lib/utils'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

interface Props {
  stats: VocabStatsRecord
}

/** The word-list views, in the order a learner moves words through them. */
export function vocabStatusLinks(stats: VocabStatsRecord) {
  return [
    {
      dot: 'bg-accent-blue',
      href: '/vocabulary/words?view=learning',
      label: 'Learning',
      value: stats.learningCount,
    },
    {
      dot: 'bg-brand',
      href: '/vocabulary/words?view=dueToday',
      label: 'Due Today',
      value: stats.dueTodayCount,
    },
    {
      dot: 'bg-accent-orange',
      href: '/vocabulary/words?view=alreadyKnow',
      label: 'Already Know',
      value: stats.alreadyKnowCount,
    },
    {
      dot: 'bg-accent-purple',
      href: '/vocabulary/words?view=mastered',
      label: 'Mastered',
      value: stats.masteredCount,
    },
    {
      dot: 'bg-accent-green',
      href: '/vocabulary/words?view=knownTotal',
      label: 'Known Total',
      value: stats.totalKnownCount,
    },
  ]
}

/**
 * Word counts as one compact strip of links into the word list, then the
 * last two weeks of growth and the hardest words side by side.
 */
export function VocabularyStatsOverview({ stats }: Props) {
  const maxGrowth = Math.max(1, ...stats.dailyGrowth.map(point => point.count))
  const progress =
    stats.totalStartedCount === 0
      ? 0
      : Math.round((stats.totalKnownCount / stats.totalStartedCount) * 100)

  return (
    <div className="grid min-w-0 content-start gap-3">
      <ul className="border-line bg-surface rounded-panel motion-stagger grid grid-cols-2 gap-1 border p-1.5 sm:grid-cols-5">
        {vocabStatusLinks(stats).map(item => (
          <li
            className="last:col-span-2 sm:last:col-span-1"
            key={item.href}
          >
            <Link
              className="soft-press hover:bg-tint-soft rounded-control grid gap-1 px-3 py-2.5"
              href={item.href}
            >
              <span className="text-ink-soft flex items-center gap-1.5 text-xs">
                <span
                  aria-hidden="true"
                  className={cn('size-2 shrink-0 rounded-full', item.dot)}
                />
                <span className="truncate">{item.label}</span>
              </span>
              <strong className="font-sans text-2xl leading-none font-medium tabular-nums">
                {item.value}
              </strong>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="vocab-growth-title"
          className="border-line bg-surface rounded-panel grid content-start gap-3 border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2
              className="text-sm font-medium"
              id="vocab-growth-title"
            >
              Daily word growth
            </h2>
            <span className="text-ink-soft text-xs tabular-nums">
              {progress}% known
            </span>
          </div>
          <div className="grid h-24 grid-cols-14 items-end gap-1">
            {stats.dailyGrowth.map(point => (
              <div
                className="grid h-full min-w-0 content-end gap-1"
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
                <span className="text-ink-soft truncate text-center text-[9px]">
                  {point.label.slice(-2)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="vocab-hardest-title"
          className="border-line bg-surface rounded-panel grid content-start gap-2 border p-4"
        >
          <h2
            className="text-sm font-medium"
            id="vocab-hardest-title"
          >
            Hardest words
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
                    {word.wrongCount} misses - {word.accuracyPercent}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft text-xs leading-5">
              No hard words yet. Missed recall answers will appear here.
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

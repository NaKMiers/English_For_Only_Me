'use client'

import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

interface Props {
  stats: VocabStatsRecord
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
 * The last two weeks of growth and the hardest words side by side. The word
 * counts live in WordGardenHero ("How a word grows"), linked into the list.
 */
export function VocabularyStatsOverview({ stats }: Props) {
  const { stats: t } = useMessages().vocabulary
  const maxGrowth = Math.max(1, ...stats.dailyGrowth.map(point => point.count))
  const progress =
    stats.totalStartedCount === 0
      ? 0
      : Math.round((stats.totalKnownCount / stats.totalStartedCount) * 100)

  return (
    <div className="grid min-w-0 content-start gap-3">
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
              {t.growthTitle}
            </h2>
            <span className="text-ink-soft text-xs tabular-nums">
              {format(t.knownShare, { percent: progress })}
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
    </div>
  )
}

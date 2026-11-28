'use client'

import type { ReactNode } from 'react'

import { useMessages } from '@/i18n/client'
import { plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type {
  DictationMistakeTaxonomyRecord,
  DictationVideoStatsRecord,
} from '@/modules/dictation/types'

import { formatDuration } from './formatDuration'

interface Props {
  stats: DictationVideoStatsRecord
}

const MISTAKE_KEYS: Array<keyof DictationMistakeTaxonomyRecord> = [
  'missing',
  'wrong',
  'extra',
  'spellingVariant',
]

const MISTAKE_BAR_CLASS_NAME: Record<
  keyof DictationMistakeTaxonomyRecord,
  string
> = {
  extra: 'bg-accent-purple',
  missing: 'bg-accent-orange',
  spellingVariant: 'bg-accent-blue',
  wrong: 'bg-danger',
}

/** Accuracy reads at a glance: low is warm, middling is amber, high is green. */
function accuracyClassName(accuracy: number) {
  if (accuracy < 50) return 'bg-danger-soft text-danger'
  if (accuracy < 75) return 'bg-pastel-peach text-accent-orange'

  return 'bg-pastel-mint text-lesson-correct'
}

function Card({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  return (
    <section
      aria-label={title}
      className={cn(
        'border-line bg-surface rounded-panel grid min-w-0 content-start gap-3 border p-4',
        className
      )}
    >
      <h2 className="font-sans text-base font-medium">{title}</h2>
      {children}
    </section>
  )
}

/**
 * Everything under the results head on one screen: a row of small numbers,
 * then the hardest sentences beside where the mistakes came from. No folds
 * and no panel per number; each list is compact enough to read in place.
 */
export function DictationStatsPanel({ stats }: Props) {
  const t = useMessages()
  const text = t.dictation.stats
  const tiles = [
    { label: text.overall, value: `${stats.overallWordAccuracy}%` },
    {
      label: text.time,
      value: formatDuration(t.dictation.duration, stats.timeSpentMs),
    },
    { label: text.retriesLabel, value: stats.retryCount },
    { label: text.replays, value: stats.replayCount },
    { label: text.reveals, value: stats.revealCount },
    { label: text.skips, value: stats.skipCount },
  ]
  const mistakeMax = Math.max(
    1,
    ...MISTAKE_KEYS.map(key => stats.mistakeTaxonomy[key])
  )

  return (
    <div className="grid min-w-0 gap-4">
      <dl className="grid grid-cols-3 gap-2 lg:grid-cols-6">
        {tiles.map(tile => (
          <div
            className="border-line bg-surface rounded-control grid gap-0.5 border px-3 py-2"
            key={tile.label}
          >
            <dt className="text-ink-soft text-xs">{tile.label}</dt>
            <dd className="font-sans text-xl leading-tight font-medium tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title={text.hardestTitle}>
          {stats.hardestSegments.length > 0 ? (
            <ol className="divide-line grid divide-y">
              {stats.hardestSegments.map(segment => (
                <li
                  className="flex min-w-0 items-start gap-3 py-2.5 first:pt-0 last:pb-0"
                  key={segment.segmentId}
                >
                  <span
                    className={cn(
                      'rounded-tag shrink-0 px-2 py-0.5 text-xs font-semibold tabular-nums',
                      accuracyClassName(segment.accuracy)
                    )}
                  >
                    {segment.accuracy}%
                  </span>
                  <span className="grid min-w-0 flex-1 gap-0.5">
                    <span className="line-clamp-2 text-sm leading-5">
                      {segment.label}
                    </span>
                    <span className="text-ink-soft text-xs">
                      {plural(text.attempts, segment.attemptCount)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink-soft text-sm leading-6">
              {text.hardestEmpty}
            </p>
          )}
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card title={text.mistakeMap}>
            <ul className="grid gap-2.5">
              {MISTAKE_KEYS.map(key => {
                const count = stats.mistakeTaxonomy[key]

                return (
                  <li
                    className="grid gap-1"
                    key={key}
                  >
                    <span className="flex items-baseline justify-between gap-3 text-sm">
                      {text.mistakeTypes[key]}
                      <span
                        className="text-ink-soft text-xs tabular-nums"
                        title={plural(text.tokens, count)}
                      >
                        {count}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-tint-soft h-1.5 overflow-hidden rounded-full"
                    >
                      <span
                        className={cn(
                          'block h-full rounded-full',
                          MISTAKE_BAR_CLASS_NAME[key]
                        )}
                        style={{ width: `${(count / mistakeMax) * 100}%` }}
                      />
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card title={text.missedWords}>
            {stats.commonMissedWords.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {stats.commonMissedWords.map(word => (
                  <li
                    className="border-line bg-tint-soft rounded-tag inline-flex items-baseline gap-1.5 border px-2 py-1 text-sm"
                    key={word.word}
                    title={plural(text.misses, word.count)}
                  >
                    {word.word}
                    <span className="text-ink-soft text-xs tabular-nums">
                      ×{word.count}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-soft text-sm leading-6">
                {text.missedWordsEmpty}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

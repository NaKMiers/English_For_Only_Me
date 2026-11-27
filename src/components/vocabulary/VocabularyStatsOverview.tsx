'use client'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { Progress } from '@/components/ui/progress'
import type { VocabStatsRecord } from '@/modules/vocabulary/types'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  stats: VocabStatsRecord
}

export function VocabularyStatsOverview({ stats }: Props) {
  const maxGrowth = Math.max(1, ...stats.dailyGrowth.map(point => point.count))
  const progress =
    stats.totalStartedCount === 0
      ? 0
      : Math.round((stats.totalKnownCount / stats.totalStartedCount) * 100)

  return (
    <>
      <div className="motion-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricTile
          href="/vocabulary/words?view=learning"
          label="Learning"
          value={String(stats.learningCount)}
        />
        <MetricTile
          href="/vocabulary/words?view=dueToday"
          label="Due Today"
          value={String(stats.dueTodayCount)}
        />
        <MetricTile
          href="/vocabulary/words?view=alreadyKnow"
          label="Already Know"
          value={String(stats.alreadyKnowCount)}
        />
        <MetricTile
          href="/vocabulary/words?view=mastered"
          label="Mastered"
          value={String(stats.masteredCount)}
        />
        <MetricTile
          href="/vocabulary/words?view=knownTotal"
          label="Known Total"
          value={String(stats.totalKnownCount)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <ContentPanel
          eyebrow="Growth"
          title="Daily word growth"
        >
          <Progress
            value={progress}
            className="border-line bg-tint rounded-tag h-4 border"
          />
          <div className="grid min-h-32 grid-cols-7 items-end gap-2 sm:grid-cols-14">
            {stats.dailyGrowth.map(point => (
              <div
                key={point.label}
                className="grid min-w-0 gap-1"
              >
                <div
                  className="border-line bg-brand rounded-tag motion-grow-y min-h-2 border"
                  style={{
                    height: `${Math.max(8, (point.count / maxGrowth) * 96)}px`,
                  }}
                  title={`${point.label}: ${point.count}`}
                />
                <span className="text-ink-soft truncate text-center text-[10px] font-normal">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </ContentPanel>

        <ContentPanel
          eyebrow="Focus"
          title="Hardest words"
        >
          {stats.hardestWords.length > 0 ? (
            <div className="grid gap-2">
              {stats.hardestWords.map(word => (
                <div
                  key={word.vocabEntryId}
                  className="border-line bg-tint rounded-control grid gap-2 border p-3"
                >
                  <VocabTermHeader
                    headingClassName="text-xl"
                    term={word.term}
                  />
                  <p className="text-ink-soft text-xs font-normal">
                    {word.wrongCount} misses - {word.accuracyPercent}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-sm leading-6 font-normal">
              No hard words yet. Missed recall answers will appear here.
            </p>
          )}
        </ContentPanel>
      </div>
    </>
  )
}

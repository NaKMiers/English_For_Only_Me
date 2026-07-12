'use client'

import { MangaPanel } from '@/components/common/MangaPanel'
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
        <MangaPanel
          eyebrow="Growth"
          title="Daily word growth"
        >
          <Progress
            value={progress}
            className="border-manga-black bg-manga-paper-soft h-4 rounded-none border-2"
          />
          <div className="grid min-h-32 grid-cols-7 items-end gap-2 sm:grid-cols-14">
            {stats.dailyGrowth.map(point => (
              <div
                key={point.label}
                className="grid min-w-0 gap-1"
              >
                <div
                  className="border-manga-black bg-manga-red min-h-2 border-2"
                  style={{
                    height: `${Math.max(8, (point.count / maxGrowth) * 96)}px`,
                  }}
                  title={`${point.label}: ${point.count}`}
                />
                <span className="text-manga-ink-soft truncate text-center text-[10px] font-black">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </MangaPanel>

        <MangaPanel
          eyebrow="Focus"
          title="Hardest words"
        >
          {stats.hardestWords.length > 0 ? (
            <div className="grid gap-2">
              {stats.hardestWords.map(word => (
                <div
                  key={word.vocabEntryId}
                  className="border-manga-black bg-manga-paper-soft grid gap-2 border-2 p-3"
                >
                  <VocabTermHeader
                    headingClassName="text-xl"
                    term={word.term}
                  />
                  <p className="text-manga-ink-soft text-xs font-black uppercase">
                    {word.wrongCount} misses - {word.accuracyPercent}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
              No hard words yet. Missed recall answers will appear here.
            </p>
          )}
        </MangaPanel>
      </div>
    </>
  )
}

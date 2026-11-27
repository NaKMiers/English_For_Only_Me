'use client'

import { CalendarClock, Flame, ListChecks, Video } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { SketchChart } from '@/components/common/SketchChart'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

interface Props {
  stats: DictationGlobalStatsRecord
}

function formatDuration(
  text: Messages['dictation']['duration'],
  durationMs: number
) {
  const totalMinutes = Math.round(durationMs / 60000)

  if (totalMinutes <= 0) return format(text.minutes, { minutes: 0 })

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return format(text.minutes, { minutes })
  if (minutes === 0) return format(text.hours, { hours })

  return format(text.hoursMinutes, { hours, minutes })
}

export function DictationGlobalStats({ stats }: Props) {
  const t = useMessages()
  const text = t.dictation.globalStats
  const duration = t.dictation.duration
  const isEmpty =
    stats.totalVideoCount === 0 &&
    stats.completedSegmentCount === 0 &&
    stats.weeklyPracticeTimeMs === 0

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={text.completedVideos}
          value={`${stats.completedVideoCount}`}
          detail={plural(text.savedVideos, stats.totalVideoCount)}
          tone="red"
          icon={
            <Video
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label={text.completedSegments}
          value={`${stats.completedSegmentCount}`}
          detail={text.completedSegmentsDetail}
          icon={
            <ListChecks
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label={text.thisWeek}
          value={formatDuration(duration, stats.weeklyPracticeTimeMs)}
          detail={format(text.thisMonth, {
            duration: formatDuration(duration, stats.monthlyPracticeTimeMs),
          })}
          icon={
            <CalendarClock
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label={text.streak}
          value={`${stats.activeStreakDays}`}
          detail={plural(text.reviewDue, stats.dueReviewItemCount)}
          tone="ink"
          icon={
            <Flame
              aria-hidden="true"
              className="size-5"
            />
          }
        />
      </div>

      {isEmpty ? (
        <ContentPanel
          eyebrow={text.emptyEyebrow}
          title={text.emptyTitle}
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            {text.emptyDescription}
          </p>
          <div className="flex flex-wrap gap-3">
            <ActionButton href="/admin/dictation/import">
              {text.importVideo}
            </ActionButton>
            <ActionButton
              href="/dictation"
              tone="paper"
            >
              {text.backToLab}
            </ActionButton>
          </div>
        </ContentPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <ContentPanel
            eyebrow={text.trendEyebrow}
            title={text.trendTitle}
          >
            <SketchChart
              label={text.trendLabel}
              points={stats.firstTryAccuracyTrend.map(point => point.accuracy)}
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {stats.firstTryAccuracyTrend.slice(-4).map(point => (
                <QueueRow
                  key={point.label}
                  title={`${point.accuracy}%`}
                  meta={point.label}
                />
              ))}
            </div>
          </ContentPanel>

          <ContentPanel
            eyebrow={t.dictation.stats.taxonomyEyebrow}
            title={text.mistakeTypesTitle}
          >
            <div className="grid gap-3">
              {stats.repeatedMistakeTypes.map(item => (
                <QueueRow
                  key={item.type}
                  title={t.dictation.stats.mistakeTypes[item.type]}
                  meta={plural(t.dictation.stats.tokens, item.count)}
                  status={item.count > 0 ? 'watch' : 'quiet'}
                />
              ))}
            </div>
          </ContentPanel>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ContentPanel
          eyebrow={t.dictation.stats.wordsEyebrow}
          title={text.weakWords}
        >
          {stats.weakWords.length > 0 ? (
            <div className="grid gap-3">
              {stats.weakWords.map(word => (
                <QueueRow
                  key={word.word}
                  title={word.word}
                  meta={plural(t.dictation.stats.misses, word.count)}
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-base leading-7 font-normal">
              {text.weakWordsEmpty}
            </p>
          )}
        </ContentPanel>

        <ContentPanel
          eyebrow={text.nextEyebrow}
          title={text.nextTitle}
        >
          <div className="grid gap-3">
            <QueueRow
              title={text.reviewDueItems}
              meta={plural(text.waiting, stats.dueReviewItemCount)}
              href="/dictation/review"
            />
            <QueueRow
              title={text.continueVideos}
              meta={plural(
                text.unfinished,
                Math.max(stats.totalVideoCount - stats.completedVideoCount, 0)
              )}
              href="/dictation"
            />
          </div>
        </ContentPanel>
      </div>
    </div>
  )
}

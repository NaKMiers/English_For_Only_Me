import { CalendarClock, Flame, ListChecks, Video } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { SketchChart } from '@/components/common/SketchChart'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DictationGlobalStatsRecord } from '@/modules/dictation/types'

interface Props {
  stats: DictationGlobalStatsRecord
}

function formatDuration(durationMs: number) {
  const totalMinutes = Math.round(durationMs / 60000)

  if (totalMinutes <= 0) return '0m'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`

  return `${hours}h ${minutes}m`
}

export function DictationGlobalStats({ stats }: Props) {
  const isEmpty =
    stats.totalVideoCount === 0 &&
    stats.completedSegmentCount === 0 &&
    stats.weeklyPracticeTimeMs === 0

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Completed videos"
          value={`${stats.completedVideoCount}`}
          detail={`${stats.totalVideoCount} saved videos`}
          tone="red"
          icon={
            <Video
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label="Completed segments"
          value={`${stats.completedSegmentCount}`}
          detail="Correct, revealed, or skipped"
          icon={
            <ListChecks
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label="This week"
          value={formatDuration(stats.weeklyPracticeTimeMs)}
          detail={`${formatDuration(stats.monthlyPracticeTimeMs)} this month`}
          icon={
            <CalendarClock
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label="Active streak"
          value={`${stats.activeStreakDays}`}
          detail={`${stats.dueReviewItemCount} review items due`}
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
        <MangaPanel
          eyebrow="Empty"
          title="No saved practice yet"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            Import a video, build segments, and finish a practice session. This
            page will then show where Dictation Lab should push you next.
          </p>
          <div className="flex flex-wrap gap-3">
            <MangaButton href="/admin/import">Import Video</MangaButton>
            <MangaButton
              href="/dictation"
              tone="paper"
            >
              Back To Lab
            </MangaButton>
          </div>
        </MangaPanel>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <MangaPanel
            eyebrow="Trend"
            title="First-try accuracy"
          >
            <SketchChart
              label="Last 7 practice days"
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
          </MangaPanel>

          <MangaPanel
            eyebrow="Taxonomy"
            title="Repeated mistake types"
          >
            <div className="grid gap-3">
              {stats.repeatedMistakeTypes.map(item => (
                <QueueRow
                  key={item.type}
                  title={item.label}
                  meta={`${item.count} tokens`}
                  status={item.count > 0 ? 'watch' : 'quiet'}
                />
              ))}
            </div>
          </MangaPanel>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <MangaPanel
          eyebrow="Words"
          title="Weak words"
        >
          {stats.weakWords.length > 0 ? (
            <div className="grid gap-3">
              {stats.weakWords.map(word => (
                <QueueRow
                  key={word.word}
                  title={word.word}
                  meta={`${word.count} misses`}
                />
              ))}
            </div>
          ) : (
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              No weak words yet. The list starts after real attempts.
            </p>
          )}
        </MangaPanel>

        <MangaPanel
          eyebrow="Next"
          title="Where to practice"
        >
          <div className="grid gap-3">
            <QueueRow
              title="Review due items"
              meta={`${stats.dueReviewItemCount} waiting`}
              href="/dictation/review"
            />
            <QueueRow
              title="Continue saved videos"
              meta={`${Math.max(stats.totalVideoCount - stats.completedVideoCount, 0)} unfinished`}
              href="/dictation"
            />
          </div>
        </MangaPanel>
      </div>
    </div>
  )
}

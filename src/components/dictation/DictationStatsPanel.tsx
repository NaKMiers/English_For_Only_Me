import {
  ChartNoAxesColumnIncreasing,
  Clock3,
  Eye,
  RotateCcw,
} from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import type { DictationVideoStatsRecord } from '@/modules/dictation/types'

interface Props {
  stats: DictationVideoStatsRecord
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

export function DictationStatsPanel({ stats }: Props) {
  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Completion"
          value={`${stats.completionPercentage}%`}
          detail={`${stats.completedSegmentCount}/${stats.segmentCount} sentences resolved`}
          tone="red"
          icon={
            <ChartNoAxesColumnIncreasing
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label="First Try"
          value={`${stats.firstTryWordAccuracy}%`}
          detail="Word accuracy on first checks"
        />
        <MetricTile
          label="Overall"
          value={`${stats.overallWordAccuracy}%`}
          detail="All checked attempts"
        />
        <MetricTile
          label="Time"
          value={formatDuration(stats.timeSpentMs)}
          detail={`${stats.retryCount} retries`}
          icon={
            <Clock3
              aria-hidden="true"
              className="size-5"
            />
          }
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <MangaPanel
          eyebrow="Weakest"
          title="Hardest segments"
        >
          {stats.hardestSegments.length > 0 ? (
            <div className="grid gap-3">
              {stats.hardestSegments.map(segment => (
                <QueueRow
                  key={segment.segmentId}
                  title={segment.label}
                  meta={`${segment.accuracy}% accuracy across ${segment.attemptCount} attempts`}
                  status="review"
                />
              ))}
            </div>
          ) : (
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              No attempts yet. Finish a few sentences and this panel will show
              what to review.
            </p>
          )}
        </MangaPanel>

        <MangaPanel
          eyebrow="Taxonomy"
          title="Mistake map"
        >
          <div className="grid gap-3">
            <QueueRow
              title="Missing words"
              meta={`${stats.mistakeTaxonomy.missing} tokens`}
              status="gap"
            />
            <QueueRow
              title="Wrong words"
              meta={`${stats.mistakeTaxonomy.wrong} tokens`}
              status="swap"
            />
            <QueueRow
              title="Extra words"
              meta={`${stats.mistakeTaxonomy.extra} tokens`}
              status="extra"
            />
            <QueueRow
              title="Spelling variants"
              meta={`${stats.mistakeTaxonomy.spellingVariant} tokens`}
              status="spell"
            />
          </div>
        </MangaPanel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <MangaPanel
          eyebrow="Words"
          title="Common missed words"
        >
          {stats.commonMissedWords.length > 0 ? (
            <div className="grid gap-3">
              {stats.commonMissedWords.map(word => (
                <QueueRow
                  key={word.word}
                  title={word.word}
                  meta={`${word.count} misses`}
                />
              ))}
            </div>
          ) : (
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              No missed words have been recorded yet.
            </p>
          )}
        </MangaPanel>

        <MangaPanel
          eyebrow="Behavior"
          title="Recovery signals"
        >
          <div className="grid gap-3">
            <QueueRow
              title="Replays"
              meta={`${stats.replayCount} segment replays`}
              action={
                <RotateCcw
                  aria-hidden="true"
                  className="size-5"
                />
              }
            />
            <QueueRow
              title="Reveals"
              meta={`${stats.revealCount} answers revealed`}
              action={
                <Eye
                  aria-hidden="true"
                  className="size-5"
                />
              }
            />
            <QueueRow
              title="Skips"
              meta={`${stats.skipCount} sentences skipped`}
            />
          </div>
        </MangaPanel>
      </div>
    </div>
  )
}

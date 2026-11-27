'use client'

import {
  ChartNoAxesColumnIncreasing,
  Clock3,
  Eye,
  RotateCcw,
} from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { DictationVideoStatsRecord } from '@/modules/dictation/types'

interface Props {
  stats: DictationVideoStatsRecord
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

export function DictationStatsPanel({ stats }: Props) {
  const t = useMessages()
  const text = t.dictation.stats

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={text.completion}
          value={`${stats.completionPercentage}%`}
          detail={format(text.resolved, {
            done: stats.completedSegmentCount,
            total: stats.segmentCount,
          })}
          tone="red"
          icon={
            <ChartNoAxesColumnIncreasing
              aria-hidden="true"
              className="size-5"
            />
          }
        />
        <MetricTile
          label={text.firstTry}
          value={`${stats.firstTryWordAccuracy}%`}
          detail={text.firstTryDetail}
        />
        <MetricTile
          label={text.overall}
          value={`${stats.overallWordAccuracy}%`}
          detail={text.overallDetail}
        />
        <MetricTile
          label={text.time}
          value={formatDuration(t.dictation.duration, stats.timeSpentMs)}
          detail={plural(text.retries, stats.retryCount)}
          icon={
            <Clock3
              aria-hidden="true"
              className="size-5"
            />
          }
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <ContentPanel
          eyebrow={text.hardestEyebrow}
          title={text.hardestTitle}
        >
          {stats.hardestSegments.length > 0 ? (
            <div className="grid gap-3">
              {stats.hardestSegments.map(segment => (
                <QueueRow
                  key={segment.segmentId}
                  title={segment.label}
                  meta={plural(text.hardestMeta, segment.attemptCount, {
                    accuracy: segment.accuracy,
                  })}
                  status="review"
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-base leading-7 font-normal">
              {text.hardestEmpty}
            </p>
          )}
        </ContentPanel>

        <ContentPanel
          eyebrow={text.taxonomyEyebrow}
          title={text.mistakeMap}
        >
          <div className="grid gap-3">
            <QueueRow
              title={text.mistakeTypes.missing}
              meta={plural(text.tokens, stats.mistakeTaxonomy.missing)}
              status="gap"
            />
            <QueueRow
              title={text.mistakeTypes.wrong}
              meta={plural(text.tokens, stats.mistakeTaxonomy.wrong)}
              status="swap"
            />
            <QueueRow
              title={text.mistakeTypes.extra}
              meta={plural(text.tokens, stats.mistakeTaxonomy.extra)}
              status="extra"
            />
            <QueueRow
              title={text.mistakeTypes.spellingVariant}
              meta={plural(text.tokens, stats.mistakeTaxonomy.spellingVariant)}
              status="spell"
            />
          </div>
        </ContentPanel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <ContentPanel
          eyebrow={text.wordsEyebrow}
          title={text.missedWords}
        >
          {stats.commonMissedWords.length > 0 ? (
            <div className="grid gap-3">
              {stats.commonMissedWords.map(word => (
                <QueueRow
                  key={word.word}
                  title={word.word}
                  meta={plural(text.misses, word.count)}
                />
              ))}
            </div>
          ) : (
            <p className="text-ink-soft text-base leading-7 font-normal">
              {text.missedWordsEmpty}
            </p>
          )}
        </ContentPanel>

        <ContentPanel
          eyebrow={text.behaviorEyebrow}
          title={text.recoveryTitle}
        >
          <div className="grid gap-3">
            <QueueRow
              title={text.replays}
              meta={plural(text.replaysMeta, stats.replayCount)}
              action={
                <RotateCcw
                  aria-hidden="true"
                  className="size-5"
                />
              }
            />
            <QueueRow
              title={text.reveals}
              meta={plural(text.revealsMeta, stats.revealCount)}
              action={
                <Eye
                  aria-hidden="true"
                  className="size-5"
                />
              }
            />
            <QueueRow
              title={text.skips}
              meta={plural(text.skipsMeta, stats.skipCount)}
            />
          </div>
        </ContentPanel>
      </div>
    </div>
  )
}

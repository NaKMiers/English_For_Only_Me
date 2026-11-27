'use client'

import { ContentPanel } from '@/components/common/ContentPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type {
  DictationVideoProgress,
  DictationVideoStatsRecord,
} from '@/modules/dictation/types'
import { getDictationResultsAction } from '@/modules/dictation/videoReadiness'

import { DictationVideoThumbnail } from './DictationVideoThumbnail'

interface Props {
  isEmpty: boolean
  progress: DictationVideoProgress
  stats: DictationVideoStatsRecord
  thumbnailUrl?: string | null
  title: string
  videoId: string
  youtubeVideoId?: string | null
}

export function DictationResultsSummary({
  isEmpty,
  progress,
  stats,
  thumbnailUrl = null,
  title,
  videoId,
  youtubeVideoId = null,
}: Props) {
  const t = useMessages()
  const text = t.dictation.results
  const action = getDictationResultsAction({ isEmpty, progress, videoId })

  return (
    <ContentPanel
      eyebrow={text.eyebrow[progress]}
      title={title}
      action={
        <ActionButton
          href={action.href}
          tone="paper"
        >
          {t.dictation.resultsAction[action.kind]}
        </ActionButton>
      }
    >
      {isEmpty ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-ink-soft text-base leading-7 font-normal">
            {progress === 'inProgress'
              ? text.inProgressEmpty
              : text.notStartedEmpty}
          </p>
          <DictationVideoThumbnail
            title={title}
            thumbnailUrl={thumbnailUrl}
            youtubeVideoId={youtubeVideoId}
            sizes="(min-width: 640px) 30vw, 100vw"
            className="w-full max-w-xs sm:w-56"
          />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile
              label={t.dictation.stats.completion}
              value={`${stats.completionPercentage}%`}
              detail={format(t.dictation.stats.resolved, {
                done: stats.completedSegmentCount,
                total: stats.segmentCount,
              })}
              tone="red"
            />
            <MetricTile
              label={text.firstTryAccuracy}
              value={`${stats.firstTryWordAccuracy}%`}
              detail={t.dictation.stats.firstTryDetail}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DictationVideoThumbnail
              title={title}
              thumbnailUrl={thumbnailUrl}
              youtubeVideoId={youtubeVideoId}
              sizes="160px"
              className="w-40 shrink-0"
            />
            <p className="text-ink-soft min-w-0 flex-1 text-sm leading-6 font-normal">
              {text.builtFrom}
            </p>
          </div>
        </div>
      )}
    </ContentPanel>
  )
}

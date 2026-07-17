import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { MangaButton } from '@/components/ui/MangaButton'
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

const EYEBROW: Record<DictationVideoProgress, string> = {
  completed: 'Completed',
  inProgress: 'In progress',
  notStarted: 'Results',
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
  const action = getDictationResultsAction({ isEmpty, progress, videoId })

  return (
    <MangaPanel
      eyebrow={EYEBROW[progress]}
      title={title}
      action={
        <MangaButton
          href={action.href}
          tone="paper"
        >
          {action.label}
        </MangaButton>
      }
    >
      {isEmpty ? (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
            {progress === 'inProgress'
              ? 'Practice in progress. Resolve a few sentences and your stats will build here.'
              : 'No completed dictation attempts yet. Practice the video first, then come back for useful stats.'}
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
              label="Completion"
              value={`${stats.completionPercentage}%`}
              detail={`${stats.completedSegmentCount}/${stats.segmentCount} sentences resolved`}
              tone="red"
            />
            <MetricTile
              label="First-try accuracy"
              value={`${stats.firstTryWordAccuracy}%`}
              detail="Word accuracy on first checks"
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
            <p className="text-manga-ink-soft min-w-0 flex-1 text-sm leading-6 font-semibold">
              Built from saved attempts only: mistakes, reveals, skips, retries,
              replay deltas, and time spent.
            </p>
          </div>
        </div>
      )}
    </MangaPanel>
  )
}

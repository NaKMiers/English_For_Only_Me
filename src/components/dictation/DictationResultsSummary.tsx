import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DictationVideoStatus } from '@/modules/dictation/types'
import { getDictationResultsAction } from '@/modules/dictation/videoReadiness'

import { DictationVideoThumbnail } from './DictationVideoThumbnail'

interface Props {
  isEmpty: boolean
  thumbnailUrl?: string | null
  title: string
  videoId: string
  videoStatus: DictationVideoStatus
  youtubeVideoId?: string | null
}

export function DictationResultsSummary({
  isEmpty,
  thumbnailUrl = null,
  title,
  videoId,
  videoStatus,
  youtubeVideoId = null,
}: Props) {
  const action = getDictationResultsAction({
    isEmpty,
    videoId,
    videoStatus,
  })

  return (
    <MangaPanel
      eyebrow={videoStatus === 'completed' ? 'Completed' : 'Results'}
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
      <DictationVideoThumbnail
        title={title}
        thumbnailUrl={thumbnailUrl}
        youtubeVideoId={youtubeVideoId}
        priority
        sizes="(min-width: 1024px) 70vw, 100vw"
        className="max-w-lg"
      />
      <p className="text-manga-ink-soft text-base leading-7 font-semibold">
        {isEmpty
          ? 'No completed dictation attempts yet. Practice the video first, then come back for useful stats.'
          : 'This result page is built from saved attempts only: mistakes, reveals, skips, retries, replay deltas, and time spent.'}
      </p>
    </MangaPanel>
  )
}

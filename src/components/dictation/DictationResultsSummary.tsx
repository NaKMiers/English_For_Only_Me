import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DictationVideoStatus } from '@/modules/dictation/types'

interface Props {
  isEmpty: boolean
  title: string
  videoId: string
  videoStatus: DictationVideoStatus
}

export function DictationResultsSummary({
  isEmpty,
  title,
  videoId,
  videoStatus,
}: Props) {
  return (
    <MangaPanel
      eyebrow={videoStatus === 'completed' ? 'Completed' : 'Results'}
      title={title}
      action={
        <MangaButton
          href={`/dictation/videos/${videoId}/practice`}
          tone="paper"
        >
          Practice Again
        </MangaButton>
      }
    >
      <p className="text-manga-ink-soft text-base leading-7 font-semibold">
        {isEmpty
          ? 'No completed dictation attempts yet. Practice the video first, then come back for useful stats.'
          : 'This result page is built from saved attempts only: mistakes, reveals, skips, retries, replay deltas, and time spent.'}
      </p>
    </MangaPanel>
  )
}

import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { MangaButton } from '@/components/ui/MangaButton'
import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

interface Props {
  emptyMessage?: string
  reviewItems: DictationReviewItemApiRecord[]
  title?: string
}

const reasonLabel: Record<DictationReviewItemApiRecord['reason'], string> = {
  highRetry: 'High retry',
  lowAccuracy: 'Low accuracy',
  repeatedMistake: 'Repeated mistake',
  revealed: 'Revealed',
  skipped: 'Skipped',
}

export function DictationReviewQueue({
  emptyMessage = 'No weak sentences are due yet.',
  reviewItems,
  title = 'Review queue',
}: Props) {
  return (
    <MangaPanel
      eyebrow="Review"
      title={title}
      action={
        <MangaButton
          href="/dictation/review"
          tone="paper"
          icon={
            <ArrowRight
              aria-hidden="true"
              className="size-5"
            />
          }
        >
          Open Queue
        </MangaButton>
      }
    >
      {reviewItems.length > 0 ? (
        <div className="grid gap-3">
          {reviewItems.map(item => (
            <QueueRow
              key={item.id}
              href={`/dictation/videos/${item.videoId}/practice`}
              title={item.label}
              meta={`${reasonLabel[item.reason]} - ${item.statsSnapshot.accuracy}% accuracy`}
              status={`${item.priority}`}
              action={
                item.status === 'completed' ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="size-5 text-emerald-700"
                  />
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          {emptyMessage}
        </p>
      )}
    </MangaPanel>
  )
}

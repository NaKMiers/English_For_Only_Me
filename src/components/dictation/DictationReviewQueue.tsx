import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { ActionButton } from '@/components/ui/ActionButton'
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
    <ContentPanel
      eyebrow="Review"
      title={title}
      action={
        <ActionButton
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
        </ActionButton>
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
                    className="text-lesson-correct size-5"
                  />
                ) : null
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-ink-soft text-base leading-7 font-normal">
          {emptyMessage}
        </p>
      )}
    </ContentPanel>
  )
}

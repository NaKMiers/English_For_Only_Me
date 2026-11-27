'use client'

import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

interface Props {
  emptyMessage?: string
  reviewItems: DictationReviewItemApiRecord[]
  title?: string
}

export function DictationReviewQueue({
  emptyMessage,
  reviewItems,
  title,
}: Props) {
  const text = useMessages().dictation.reviewQueue
  const reasonLabel: Record<DictationReviewItemApiRecord['reason'], string> =
    text.reasons

  return (
    <ContentPanel
      eyebrow={text.eyebrow}
      title={title ?? text.title}
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
          {text.open}
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
              meta={format(text.itemMeta, {
                accuracy: item.statsSnapshot.accuracy,
                reason: reasonLabel[item.reason],
              })}
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
          {emptyMessage ?? text.empty}
        </p>
      )}
    </ContentPanel>
  )
}

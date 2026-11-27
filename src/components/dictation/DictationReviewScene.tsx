import { ArrowLeft, Check } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { ActionButton } from '@/components/ui/ActionButton'
import { Textarea } from '@/components/ui/textarea'
import { DICTATION_REVIEW, DICTATION_REVIEW_RULES } from '@/constants/dictation'

export function DictationReviewScene() {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <ContentPanel
        eyebrow="Page 04"
        title="One mistake becomes the next drill."
      >
        <p className="text-ink-soft text-base leading-7 font-normal">
          The review page keeps IELTS practice narrow: repeat weak sentences,
          then return to a real video.
        </p>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <ContentPanel
            eyebrow="Weak sentence"
            title="Drill"
          >
            <div className="border-line bg-tint-soft rounded-control border p-3 text-base leading-7 font-semibold">
              {DICTATION_REVIEW.sentence}
            </div>
            <Textarea
              aria-label="Weak sentence answer"
              defaultValue={DICTATION_REVIEW.answer}
              className="border-line bg-surface rounded-control min-h-28 border text-base leading-7 font-semibold"
            />
            <div className="flex flex-wrap gap-3">
              <ActionButton
                icon={
                  <Check
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                Check
              </ActionButton>
              <ActionButton
                tone="paper"
                href="/dictation"
                icon={
                  <ArrowLeft
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                Back to Video
              </ActionButton>
            </div>
          </ContentPanel>

          <ContentPanel
            eyebrow="Why"
            title="Returned"
          >
            <div className="grid gap-3">
              {DICTATION_REVIEW.weakReason.map(item => (
                <QueueRow
                  key={item.id}
                  title={item.value}
                  meta={item.label}
                />
              ))}
            </div>
          </ContentPanel>
        </div>
      </ContentPanel>

      <aside className="grid content-start gap-5">
        <ContentPanel
          eyebrow="Focus"
          title="Small loop"
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            Fast, private, measurable. No public points. No community noise.
            Just the next useful repetition.
          </p>
          <div className="grid gap-3">
            {DICTATION_REVIEW_RULES.map(item => (
              <QueueRow
                key={item.id}
                title={item.title}
                meta={item.status}
                status={item.number}
              />
            ))}
          </div>
        </ContentPanel>
      </aside>
    </div>
  )
}

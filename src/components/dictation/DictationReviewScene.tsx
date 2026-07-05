import { ArrowLeft, Check } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { QueueRow } from '@/components/common/QueueRow'
import { MangaButton } from '@/components/ui/MangaButton'
import { Textarea } from '@/components/ui/textarea'
import { DICTATION_REVIEW, DICTATION_REVIEW_RULES } from '@/constants/dictation'

export function DictationReviewScene() {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <MangaPanel
        eyebrow="Page 04"
        title="One mistake becomes the next drill."
      >
        <p className="text-manga-ink-soft text-base leading-7 font-semibold">
          The review page keeps IELTS practice narrow: repeat weak sentences,
          then return to a real video.
        </p>

        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <MangaPanel
            eyebrow="Weak sentence"
            title="Drill"
            className="shadow-[3px_3px_0_var(--manga-black)]"
          >
            <div className="border-manga-black bg-manga-pale-red border-2 p-3 text-base leading-7 font-black">
              {DICTATION_REVIEW.sentence}
            </div>
            <Textarea
              aria-label="Weak sentence answer"
              defaultValue={DICTATION_REVIEW.answer}
              className="border-manga-black bg-manga-white min-h-28 rounded-none border-3 text-base leading-7 font-semibold shadow-[3px_3px_0_var(--manga-black)]"
            />
            <div className="flex flex-wrap gap-3">
              <MangaButton
                icon={
                  <Check
                    aria-hidden="true"
                    className="size-5"
                  />
                }
              >
                Check
              </MangaButton>
              <MangaButton
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
              </MangaButton>
            </div>
          </MangaPanel>

          <MangaPanel
            eyebrow="Why"
            title="Returned"
            className="shadow-[3px_3px_0_var(--manga-black)]"
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
          </MangaPanel>
        </div>
      </MangaPanel>

      <aside className="grid content-start gap-5">
        <MangaPanel
          eyebrow="Focus"
          title="Small loop"
        >
          <p className="text-manga-ink-soft text-base leading-7 font-semibold">
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
        </MangaPanel>
      </aside>
    </div>
  )
}

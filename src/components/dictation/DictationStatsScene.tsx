import { ArrowRight } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import type {
  DictationGlobalStatsRecord,
  DictationReviewItemApiRecord,
} from '@/modules/dictation/types'

import { DictationGlobalStats } from './DictationGlobalStats'
import { DictationReviewQueue } from './DictationReviewQueue'

interface Props {
  globalStats?: DictationGlobalStatsRecord | null
  reviewItems?: DictationReviewItemApiRecord[]
}

export function DictationStatsScene({
  globalStats = null,
  reviewItems = [],
}: Props) {
  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <section className="grid min-w-0 content-start gap-5">
        <ContentPanel
          eyebrow="Page 03"
          title="Make the weak spots loud."
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            The dashboard is for one person: show what to practice next, not
            vanity numbers.
          </p>
        </ContentPanel>
        {globalStats ? (
          <DictationGlobalStats stats={globalStats} />
        ) : (
          <ContentPanel
            eyebrow="Stats"
            title="Waiting for saved data"
          >
            <p className="text-ink-soft text-base leading-7 font-normal">
              Set MONGODB_URI and finish practice to unlock real Dictation Lab
              stats.
            </p>
          </ContentPanel>
        )}
      </section>

      <aside className="grid content-start gap-5">
        <DictationReviewQueue
          reviewItems={reviewItems.slice(0, 6)}
          title="Review stack"
        />

        <ContentPanel
          eyebrow="Rule"
          title="Practice first"
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            AI appears after work is complete. The practice loop stays honest:
            listen first, then get help.
          </p>
          <ActionButton
            icon={
              <ArrowRight
                aria-hidden="true"
                className="size-5"
              />
            }
          >
            Start Review
          </ActionButton>
        </ContentPanel>
      </aside>
    </div>
  )
}

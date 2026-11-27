import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { DictationReviewQueue } from '@/components/dictation/DictationReviewQueue'
import { ActionButton } from '@/components/ui/ActionButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listDueReviewItemsForUser } from '@/modules/dictation/review/reviewItemService'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

export const metadata: Metadata = {
  title: 'Dictation Review',
  description: 'Drill weak dictation sentences from saved attempts.',
}

export const runtime = 'nodejs'

export default async function Page() {
  const reviewItems: DictationReviewItemApiRecord[] = []

  if (hasMongoDbUri()) {
    const [actorId] = await Promise.all([
      getPracticeActorId(),
      connectDatabase(),
    ])

    if (actorId)
      reviewItems.push(
        ...(await listDueReviewItemsForUser({
          limit: 30,
          userId: actorId,
        }))
      )
  }

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Dictation Lab listening module"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <ContentPanel
          eyebrow="Review"
          title="Weak sentence queue"
          action={
            <ActionButton
              href="/dictation"
              tone="paper"
            >
              Back To Lab
            </ActionButton>
          }
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            This page is for returning to weak dictation segments: skipped,
            revealed, high-retry, repeated-mistake, and low-accuracy sentences.
          </p>
        </ContentPanel>

        <DictationReviewQueue
          emptyMessage={
            hasMongoDbUri()
              ? 'No weak sentences are due. Finish a video or miss a few sentences honestly and the queue will fill itself.'
              : 'Set MONGODB_URI on the server before using saved review items.'
          }
          reviewItems={reviewItems}
        />
      </section>
    </PageShell>
  )
}

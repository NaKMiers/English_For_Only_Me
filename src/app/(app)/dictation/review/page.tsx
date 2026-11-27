import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { ContentPanel } from '@/components/common/ContentPanel'
import { DictationReviewQueue } from '@/components/dictation/DictationReviewQueue'
import { ActionButton } from '@/components/ui/ActionButton'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listDueReviewItemsForUser } from '@/modules/dictation/review/reviewItemService'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import type { DictationReviewItemApiRecord } from '@/modules/dictation/types'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.dictation.review.metaTitle,
    description: t.dictation.review.metaDescription,
  }
}

export const runtime = 'nodejs'

export default async function Page() {
  const t = await getMessages()
  const text = t.dictation.review
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
          subtitle={t.dictation.meta.labSubtitle}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <ContentPanel
          eyebrow={text.eyebrow}
          title={text.title}
          action={
            <ActionButton
              href="/dictation"
              tone="paper"
            >
              {text.backToLab}
            </ActionButton>
          }
        >
          <p className="text-ink-soft text-base leading-7 font-normal">
            {text.description}
          </p>
        </ContentPanel>

        <DictationReviewQueue
          emptyMessage={hasMongoDbUri() ? text.empty : text.noDatabase}
          reviewItems={reviewItems}
        />
      </section>
    </PageShell>
  )
}

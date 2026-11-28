import { RotateCcw } from 'lucide-react'
import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { DictationReviewQueue } from '@/components/dictation/DictationReviewQueue'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  countDueReviewItemsForUser,
  listDueReviewItemsForUser,
} from '@/modules/dictation/review/reviewItemService'
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
  let dueCount = 0

  if (hasMongoDbUri()) {
    const [actorId] = await Promise.all([
      getPracticeActorId(),
      connectDatabase(),
    ])

    if (actorId) {
      const [items, count] = await Promise.all([
        listDueReviewItemsForUser({
          limit: 30,
          userId: actorId,
        }),
        countDueReviewItemsForUser(actorId),
      ])

      reviewItems.push(...items)
      dueCount = count
    }
  }

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          page={{
            breadcrumb: [
              { href: '/dictation', label: t.dictation.browse.allTopics },
              { label: text.title },
            ],
            module: 'dictation',
            title: text.title,
          }}
          subtitle={t.dictation.meta.labSubtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/dictation', label: t.dictation.browse.allTopics },
              { label: text.title },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<RotateCcw />}
          iconClassName="bg-pastel-sky text-accent-blue"
          inTopbar
          subtitle={text.description}
          title={text.title}
        />

        <DictationReviewQueue
          emptyMessage={hasMongoDbUri() ? text.empty : text.noDatabase}
          dueCount={dueCount}
          reviewItems={reviewItems}
        />
      </section>
    </PageShell>
  )
}

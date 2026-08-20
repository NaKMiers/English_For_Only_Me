import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { AdminGrammarPanel } from '@/components/grammar/AdminGrammarPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { GrammarPointModel } from '@/models/grammar/GrammarPointModel'
import { toGrammarPointRecord } from '@/modules/grammar/services/grammarPointRecords'
import type { GrammarPointApiRecord } from '@/modules/grammar/types'

export const metadata: Metadata = { title: 'Admin Grammar' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REVIEW_QUEUE_LIMIT = 30

export default async function AdminGrammarPage() {
  let points: GrammarPointApiRecord[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()

    // Written but unreviewed, hardest-transfer first. Served by the
    // { reviewStatus, l1Risk } index.
    const queue = await GrammarPointModel.find({
      explanation: { $ne: null },
      mergedInto: null,
      reviewStatus: 'unverified',
    })
      .sort([
        ['l1Risk', 'desc'],
        ['complexity', 'desc'],
      ])
      .limit(REVIEW_QUEUE_LIMIT)
      .lean()

    points = queue.map(toGrammarPointRecord)
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/admin/grammar"
          authControl={<AuthControl />}
          subtitle="Admin grammar review"
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        {hasMongoDbUri() ? (
          <AdminGrammarPanel points={points} />
        ) : (
          <MangaPanel
            eyebrow="Admin"
            title="Database needed"
          >
            <p className="text-manga-ink-soft text-base leading-7 font-semibold">
              Set MONGODB_URI to review generated grammar lessons.
            </p>
          </MangaPanel>
        )}
      </section>
    </MangaPageShell>
  )
}

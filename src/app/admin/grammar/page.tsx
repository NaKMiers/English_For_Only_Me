import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { MangaPanel } from '@/components/common/MangaPanel'
import { AdminGrammarPanel } from '@/components/grammar/AdminGrammarPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listGrammarReviewQueue } from '@/modules/grammar/services/grammarPointListService'
import { isL1RiskToolEnabled } from '@/modules/grammar/services/grammarRouteDecisions'
import type { GrammarPointApiRecord } from '@/modules/grammar/types'

export const metadata: Metadata = { title: 'Admin Grammar' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const REVIEW_QUEUE_LIMIT = 30

export default async function AdminGrammarPage() {
  let points: GrammarPointApiRecord[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()

    // Written but unreviewed, genuinely hardest-transfer first: the order comes
    // from `getGrammarBrowseSort()`, which sorts the numeric `l1RiskRank`.
    // Served by the { reviewStatus, l1RiskRank, complexity } index.
    points = await listGrammarReviewQueue(REVIEW_QUEUE_LIMIT)
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
        {isL1RiskToolEnabled() ? (
          <MangaButton href="/admin/grammar/l1-risk">
            Judge l1Risk (local only)
          </MangaButton>
        ) : null}

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

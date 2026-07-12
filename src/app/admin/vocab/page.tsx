import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AdminVocabPanel } from '@/components/vocabulary/AdminVocabPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getVocabAdminQueueSummary } from '@/modules/vocabulary/enrichment/enrichmentService'
import type { VocabAdminQueueSummaryRecord } from '@/modules/vocabulary/types'

export const metadata: Metadata = { title: 'Admin Vocabulary' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminVocabularyPage() {
  let initialQueue: VocabAdminQueueSummaryRecord | null = null

  if (hasMongoDbUri()) {
    await connectDatabase()
    initialQueue = await getVocabAdminQueueSummary()
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/admin/vocab"
          subtitle="Admin vocabulary enrichment"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <AdminVocabPanel
          initialQueue={initialQueue}
          mongoConfigured={hasMongoDbUri()}
        />
      </section>
    </MangaPageShell>
  )
}

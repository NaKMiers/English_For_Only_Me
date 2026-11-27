import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getVocabularyDashboardData } from '@/modules/vocabulary/services/vocabDashboardService'
import type { VocabularyDashboardInitialData } from '@/modules/vocabulary/types'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.vocabulary.page.metaTitle,
    description: t.vocabulary.page.metaDescription,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function loadInitialData(): Promise<VocabularyDashboardInitialData | null> {
  try {
    const [actorId] = await Promise.all([
      getPracticeActorId(),
      connectDatabase(),
    ])

    return await getVocabularyDashboardData({ actorId })
  } catch (error) {
    // The dashboard can still load itself in the browser and show the API's
    // error message there, so a failed server read is not a blank page.
    console.error('Vocabulary dashboard server load failed.', error)

    return null
  }
}

export default async function VocabularyPage() {
  const t = await getMessages()
  const mongoConfigured = hasMongoDbUri()
  const initialData = mongoConfigured ? await loadInitialData() : null

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/vocabulary"
          page={{
            module: 'vocabulary',
            subtitle: t.vocabulary.dashboard.intro,
            title: t.vocabulary.dashboard.title,
          }}
          subtitle={t.vocabulary.page.subtitle}
        />
      }
    >
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured={mongoConfigured}
      />
    </PageShell>
  )
}

import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { requirePageUser } from '@/lib/auth/currentUser'
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

async function loadInitialData(
  userId: string
): Promise<VocabularyDashboardInitialData | null> {
  try {
    await connectDatabase()

    return await getVocabularyDashboardData({ userId })
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
  // Outside loadInitialData's try: the login redirect must not be caught.
  const user = await requirePageUser()
  const initialData = mongoConfigured ? await loadInitialData(user.id) : null

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

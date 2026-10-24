import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getPracticeActorId } from '@/modules/dictation/services/getCurrentUser'
import { getVocabularyDashboardData } from '@/modules/vocabulary/services/vocabDashboardService'
import type { VocabularyDashboardInitialData } from '@/modules/vocabulary/types'

export const metadata: Metadata = {
  title: 'Vocabulary',
  description:
    'Personal vocabulary dashboard with free dictionary lookup, Explore, and seven-touch recall.',
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
  const mongoConfigured = hasMongoDbUri()
  const initialData = mongoConfigured ? await loadInitialData() : null

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/vocabulary"
          subtitle="Vocabulary memory spine"
          authControl={<AuthControl />}
        />
      }
    >
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured={mongoConfigured}
      />
    </MangaPageShell>
  )
}

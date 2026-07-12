import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard'
import { hasMongoDbUri } from '@/constants/environments'
import { auth } from '@/lib/auth/auth'

export const metadata: Metadata = {
  title: 'Vocabulary',
  description:
    'Personal vocabulary dashboard with free dictionary lookup, Explore, and seven-touch recall.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function VocabularyPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === 'admin'

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
        isAdmin={isAdmin}
        mongoConfigured={hasMongoDbUri()}
      />
    </MangaPageShell>
  )
}

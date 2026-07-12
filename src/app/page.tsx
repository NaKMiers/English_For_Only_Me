import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import { getVocabStatsForUser } from '@/modules/vocabulary/stats/vocabStatsService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  if (!hasMongoDbUri()) return <HomeStudyDesk />

  // Stats are per-user; anonymous visitors see the desk without personal stats.
  const user = await getOptionalUser()
  if (!user) return <HomeStudyDesk />

  await connectDatabase()

  const [dictationStats, vocabStats] = await Promise.all([
    getGlobalStatsForUser(user.id),
    getVocabStatsForUser({ userId: user.id }),
  ])

  return (
    <HomeStudyDesk
      dictationStats={dictationStats}
      vocabStats={vocabStats}
    />
  )
}

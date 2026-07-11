import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  if (!hasMongoDbUri()) return <HomeStudyDesk />

  // Stats are per-user; anonymous visitors see the desk without personal stats.
  const user = await getOptionalUser()
  if (!user) return <HomeStudyDesk />

  await connectDatabase()

  return <HomeStudyDesk dictationStats={await getGlobalStatsForUser(user.id)} />
}

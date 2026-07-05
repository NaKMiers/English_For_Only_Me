import { HomeStudyDesk } from '@/components/home/HomeStudyDesk'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { getGlobalStatsForOwner } from '@/modules/dictation/stats/globalStatsService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function Home() {
  if (!hasMongoDbUri()) return <HomeStudyDesk />

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  return (
    <HomeStudyDesk dictationStats={await getGlobalStatsForOwner(ownerId)} />
  )
}

import type { Metadata } from 'next'

import { DictationHome } from '@/components/dictation/DictationHome'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { DictationVideoModel } from '@/models/dictation/DictationVideoModel'
import { listDueReviewItemsForOwner } from '@/modules/dictation/review/reviewItemService'
import { toDictationVideoRecord } from '@/modules/dictation/services/dictationVideoRecords'
import { getCurrentOwnerId } from '@/modules/dictation/services/getCurrentOwnerId'
import { getGlobalStatsForOwner } from '@/modules/dictation/stats/globalStatsService'

export const metadata: Metadata = {
  title: 'Dictation Lab',
  description:
    'Manga-style dictation module shell for private IELTS listening practice.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function DictationPage() {
  if (!hasMongoDbUri()) return <DictationHome />

  const ownerId = await getCurrentOwnerId()

  await connectDatabase()

  const [globalStats, reviewItems, videos] = await Promise.all([
    getGlobalStatsForOwner(ownerId),
    listDueReviewItemsForOwner({
      limit: 12,
      ownerId,
    }),
    DictationVideoModel.find({
      ownerId,
      status: {
        $ne: 'archived',
      },
    })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean(),
  ])

  return (
    <DictationHome
      globalStats={globalStats}
      reviewItems={reviewItems}
      videos={videos.map(toDictationVideoRecord)}
    />
  )
}

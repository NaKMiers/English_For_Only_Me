import type { Metadata } from 'next'

import type { BrowseVideoItem } from '@/components/dictation/browse/SectionAccordion'
import { VideoListPage } from '@/components/dictation/browse/VideoListPage'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { requirePageUser } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import { getCachedNoTopicVideos } from '@/modules/dictation/content/catalogReaders'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import {
  getCompletionCountsForUser,
  getInProgressVideoIdsForUser,
} from '@/modules/dictation/content/progressRepository'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.dictation.browse.uncategorized,
    description: t.dictation.noTopic.metaDescription,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function NoTopicPage() {
  const t = await getMessages()
  let items: BrowseVideoItem[] = []

  if (hasMongoDbUri()) {
    // The videos come from the catalog cache; the learner's badges and
    // favorites need the connection.
    const [user, videos] = await Promise.all([
      requirePageUser(),
      getCachedNoTopicVideos(),
      connectDatabase(),
    ])

    const [favoritedIds, completionCounts, inProgressSet] = await Promise.all([
      listFavoriteVideoIds(user.id),
      getCompletionCountsForUser(user.id),
      getInProgressVideoIdsForUser(user.id),
    ])
    const favoritedSet = new Set(favoritedIds)

    items = videos.map(video =>
      toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
    )
  }

  return (
    <VideoListPage
      emptyTitle={t.dictation.noTopic.empty}
      items={items}
      messages={t}
      subtitle={t.dictation.noTopic.description}
      title={t.dictation.browse.uncategorized}
      topbarSubtitle={t.dictation.meta.browseSubtitle}
    />
  )
}

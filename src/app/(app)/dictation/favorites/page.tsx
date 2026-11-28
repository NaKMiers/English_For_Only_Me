import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import type { BrowseVideoItem } from '@/components/dictation/browse/SectionAccordion'
import { VideoListPage } from '@/components/dictation/browse/VideoListPage'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import { listFavoriteVideosForUser } from '@/modules/dictation/content/favoriteRepository'
import {
  getCompletionCountsForUser,
  getInProgressVideoIdsForUser,
} from '@/modules/dictation/content/progressRepository'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return { title: t.dictation.favorites.title }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function FavoritesPage() {
  // Favorites are per-user - require sign-in. The connection handshake
  // overlaps with auth.
  const [user] = await Promise.all([
    getOptionalUser(),
    hasMongoDbUri() ? connectDatabase() : null,
  ])
  if (!user) redirect('/api/auth/signin?callbackUrl=/dictation/favorites')

  const t = await getMessages()
  let items: BrowseVideoItem[] = []

  if (hasMongoDbUri()) {
    const [videos, completionCounts, inProgressSet] = await Promise.all([
      listFavoriteVideosForUser(user.id),
      getCompletionCountsForUser(user.id),
      getInProgressVideoIdsForUser(user.id),
    ])
    const favoritedSet = new Set(videos.map(video => video.id))

    items = videos.map(video =>
      toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
    )
  }

  return (
    <VideoListPage
      canFavorite
      emptyTitle={t.dictation.favorites.empty}
      items={items}
      messages={t}
      title={t.dictation.favorites.title}
      topbarSubtitle={t.dictation.meta.favoritesSubtitle}
    />
  )
}

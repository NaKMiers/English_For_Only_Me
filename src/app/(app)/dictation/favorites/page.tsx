import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import {
  BrowseVideoList,
  type BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listFavoriteVideosForUser } from '@/modules/dictation/content/favoriteRepository'
import { listCompletedVideoIdsForUser } from '@/modules/dictation/content/progressRepository'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = { title: 'Favorites' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function FavoritesPage() {
  // Favorites are per-user — require sign-in.
  const user = await getOptionalUser()
  if (!user) redirect('/api/auth/signin?callbackUrl=/dictation/favorites')

  let items: BrowseVideoItem[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [videos, completedIds] = await Promise.all([
      listFavoriteVideosForUser(user.id),
      listCompletedVideoIdsForUser(user.id),
    ])
    const completedSet = new Set(completedIds)

    items = videos.map(video => ({
      id: video.id,
      title: video.title,
      level: video.level,
      practiceHref: hasDictationTranscript(video)
        ? `/dictation/videos/${video.id}/practice`
        : null,
      favorited: true,
      done: completedSet.has(video.id),
      thumbnailUrl: video.thumbnailUrl,
      youtubeVideoId: video.youtubeVideoId,
    }))
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Your favorites"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <BrowseBreadcrumb current="Favorites" />
        <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
          Favorites
        </h1>
        <BrowseVideoList
          videos={items}
          canFavorite
          emptyLabel="No favorites yet — tap the star on any lesson."
        />
      </section>
    </MangaPageShell>
  )
}

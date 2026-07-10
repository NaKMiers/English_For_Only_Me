import type { Metadata } from 'next'

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
import { listNoTopicVideos } from '@/modules/dictation/content/contentRepository'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import { listCompletedVideoIdsForUser } from '@/modules/dictation/content/progressRepository'
import {
  getOptionalUser,
  getPracticeActorId,
} from '@/modules/dictation/services/getCurrentUser'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const metadata: Metadata = {
  title: 'Uncategorized',
  description: 'Dictation videos not yet filed under a topic.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function NoTopicPage() {
  const user = await getOptionalUser()
  const canFavorite = Boolean(user)
  // Completion badges follow the practice actor (guest or user); favoriting
  // stays login-only.
  const actorId = await getPracticeActorId()
  let items: BrowseVideoItem[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [videos, favoritedIds, completedIds] = await Promise.all([
      listNoTopicVideos(),
      user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
      actorId
        ? listCompletedVideoIdsForUser(actorId)
        : Promise.resolve<string[]>([]),
    ])
    const favoritedSet = new Set(favoritedIds)
    const completedSet = new Set(completedIds)

    items = videos.map(video => ({
      id: video.id,
      title: video.title,
      level: video.level,
      practiceHref: hasDictationTranscript(video)
        ? `/dictation/videos/${video.id}/practice`
        : null,
      favorited: favoritedSet.has(video.id),
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
          subtitle="Browse dictation topics"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <BrowseBreadcrumb current="Uncategorized" />
        <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
          Uncategorized
        </h1>
        <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
          Lessons not yet filed under a topic.
        </p>
        <BrowseVideoList
          videos={items}
          canFavorite={canFavorite}
          emptyLabel="No uncategorized lessons."
        />
      </section>
    </MangaPageShell>
  )
}

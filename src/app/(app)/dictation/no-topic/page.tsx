import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageHero } from '@/components/common/PageHero'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import {
  BrowseVideoList,
  type BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import { getCachedNoTopicVideos } from '@/modules/dictation/content/catalogReaders'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import {
  getCompletionCountsForUser,
  getInProgressVideoIdsForUser,
} from '@/modules/dictation/content/progressRepository'
import {
  getOptionalUser,
  getPracticeActorId,
} from '@/modules/dictation/services/getCurrentUser'

export const metadata: Metadata = {
  title: 'Uncategorized',
  description: 'Dictation videos not yet filed under a topic.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function NoTopicPage() {
  let canFavorite = false
  let items: BrowseVideoItem[] = []

  if (hasMongoDbUri()) {
    // Completion badges follow the practice actor (guest or user); favoriting
    // stays login-only. The videos come from the catalog cache, so only a known
    // actor needs a connection.
    const [user, actorId, videos] = await Promise.all([
      getOptionalUser(),
      connectDatabaseWhen(getPracticeActorId()),
      getCachedNoTopicVideos(),
    ])
    canFavorite = Boolean(user)

    const [favoritedIds, completionCounts, inProgressSet] = await Promise.all([
      user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
      actorId
        ? getCompletionCountsForUser(actorId)
        : Promise.resolve<Map<string, number>>(new Map()),
      actorId
        ? getInProgressVideoIdsForUser(actorId)
        : Promise.resolve<Set<string>>(new Set()),
    ])
    const favoritedSet = new Set(favoritedIds)

    items = videos.map(video =>
      toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
    )
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
        <PageHero>
          <BrowseBreadcrumb current="Uncategorized" />
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
            Uncategorized
          </h1>
          <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
            Lessons not yet filed under a topic.
          </p>
        </PageHero>
        <BrowseVideoList
          videos={items}
          canFavorite={canFavorite}
          emptyLabel="No uncategorized lessons."
        />
      </section>
    </MangaPageShell>
  )
}

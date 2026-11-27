import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { PageHero } from '@/components/common/PageHero'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import {
  BrowseVideoList,
  type BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'
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
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.dictation.meta.favoritesSubtitle}
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <PageHero>
          <BrowseBreadcrumb
            current={t.dictation.favorites.title}
            labels={t.dictation.browse}
          />
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-medium">
            {t.dictation.favorites.title}
          </h1>
        </PageHero>
        <BrowseVideoList
          videos={items}
          canFavorite
          emptyLabel={t.dictation.favorites.empty}
          labels={t.dictation.browse.card}
        />
      </section>
    </PageShell>
  )
}

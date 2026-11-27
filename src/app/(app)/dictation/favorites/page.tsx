import { Star } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { PageHeader } from '@/components/common/PageHeader'
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
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          eyebrow={
            <BrowseBreadcrumb
              current={t.dictation.favorites.title}
              labels={t.dictation.browse}
            />
          }
          icon={<Star />}
          iconClassName="bg-pastel-lemon text-accent-orange"
          title={t.dictation.favorites.title}
        />
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

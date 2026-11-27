import { Headphones } from 'lucide-react'
import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { PageHeader } from '@/components/common/PageHeader'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import {
  BrowseVideoList,
  type BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
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
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.dictation.meta.browseSubtitle}
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          eyebrow={
            <BrowseBreadcrumb
              current={t.dictation.browse.uncategorized}
              labels={t.dictation.browse}
            />
          }
          icon={<Headphones />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={t.dictation.noTopic.description}
          title={t.dictation.browse.uncategorized}
        />
        <BrowseVideoList
          videos={items}
          canFavorite={canFavorite}
          emptyLabel={t.dictation.noTopic.empty}
          labels={t.dictation.browse.card}
        />
      </section>
    </PageShell>
  )
}

import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { PageHero } from '@/components/common/PageHero'
import { DictationGlobalStats } from '@/components/dictation/DictationGlobalStats'
import { InProgressSection } from '@/components/dictation/browse/InProgressSection'
import { TopicGrid } from '@/components/dictation/browse/TopicGrid'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import {
  getCachedNoTopicCount,
  getCachedTopicSummaries,
} from '@/modules/dictation/content/catalogReaders'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import {
  getCompletionCountsForUser,
  getLatestCompletedVideoForUser,
  listInProgressVideosForUser,
} from '@/modules/dictation/content/progressRepository'
import {
  getOptionalUser,
  getPracticeActorId,
} from '@/modules/dictation/services/getCurrentUser'
import { getGlobalStatsForUser } from '@/modules/dictation/stats/globalStatsService'
import type {
  DictationGlobalStatsRecord,
  DictationTopicSummaryRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.dictation.meta.allTopicsTitle,
    description: t.dictation.meta.allTopicsDescription,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function BrowseFooter({ appName }: { appName: string }) {
  return (
    <div className="border-line bg-cta text-cta-fg border-t px-5 py-4">
      <strong className="font-sans text-base font-semibold tracking-normal">
        {appName}
      </strong>
    </div>
  )
}

export default async function DictationPage() {
  const t = await getMessages()
  const text = t.dictation.landing
  let topics: DictationTopicSummaryRecord[] = []
  let globalStats: DictationGlobalStatsRecord | null = null
  let hasPracticeActor = false
  let latestCompletedVideo: DictationVideoApiRecord | null = null
  let noTopicCount = 0
  let inProgressItems: ReturnType<typeof toBrowseItem>[] = []
  let canFavorite = false

  if (hasMongoDbUri()) {
    // The catalog and the anonymous stats total come from the cache, so only a
    // known practice actor needs a connection for their own rows.
    const [user, actorId] = await Promise.all([
      getOptionalUser(),
      connectDatabaseWhen(getPracticeActorId()),
    ])
    hasPracticeActor = Boolean(actorId)
    canFavorite = Boolean(user)

    // Loaded once and shared: the stats card and the in-progress cards both
    // need this user's completion counts.
    const completionCountsPromise = actorId
      ? getCompletionCountsForUser(actorId)
      : Promise.resolve<Map<string, number>>(new Map())

    const [
      topicSummaries,
      noTopicVideos,
      stats,
      latest,
      inProgressVideos,
      favoritedIds,
      completionCounts,
    ] = await Promise.all([
      getCachedTopicSummaries(),
      getCachedNoTopicCount(),
      getGlobalStatsForUser(actorId, {
        completionCounts: completionCountsPromise,
      }),
      actorId ? getLatestCompletedVideoForUser(actorId) : Promise.resolve(null),
      actorId
        ? listInProgressVideosForUser(actorId)
        : Promise.resolve<DictationVideoApiRecord[]>([]),
      user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
      completionCountsPromise,
    ])

    topics = topicSummaries
    noTopicCount = noTopicVideos
    globalStats = stats
    latestCompletedVideo = latest

    const favoritedSet = new Set(favoritedIds)
    const inProgressSet = new Set(inProgressVideos.map(video => video.id))

    inProgressItems = inProgressVideos.map(video =>
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
      footer={<BrowseFooter appName={t.common.app.name} />}
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <PageHero>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PageTag tone="red">{text.eyebrow}</PageTag>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {latestCompletedVideo ? (
                <ActionButton
                  href={`/dictation/videos/${latestCompletedVideo.id}/results`}
                  tone="primary"
                  className="bg-tint hover:bg-tint-soft min-h-10 px-3 py-1 text-xs"
                  icon={
                    <Trophy
                      aria-hidden="true"
                      className="size-4"
                    />
                  }
                >
                  {text.latestResults}
                </ActionButton>
              ) : null}
              <Link
                href="/dictation/favorites"
                className="text-brand text-sm font-semibold hover:underline"
              >
                {text.favoritesLink}
              </Link>
            </div>
          </div>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-medium">
            {text.title}
          </h1>
          <p className="text-ink-soft max-w-2xl text-sm leading-6">
            {hasPracticeActor
              ? text.descriptionSignedIn
              : text.descriptionGuest}
          </p>
        </PageHero>
        <InProgressSection
          videos={inProgressItems}
          canFavorite={canFavorite}
          labels={t.dictation.browse}
        />
        <TopicGrid
          labels={t.dictation.browse}
          topics={topics}
          noTopicCount={noTopicCount}
        />
        {globalStats ? (
          <div className="border-line/20 mt-4 border-t pt-8">
            <DictationGlobalStats stats={globalStats} />
          </div>
        ) : null}
      </section>
    </PageShell>
  )
}

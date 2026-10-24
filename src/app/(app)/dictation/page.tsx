import type { Metadata } from 'next'
import { Trophy } from 'lucide-react'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageHero } from '@/components/common/PageHero'
import { DictationGlobalStats } from '@/components/dictation/DictationGlobalStats'
import { InProgressSection } from '@/components/dictation/browse/InProgressSection'
import { TopicGrid } from '@/components/dictation/browse/TopicGrid'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
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

export const metadata: Metadata = {
  title: 'All Topics',
  description:
    'Browse dictation practice topics by level and section - short stories, conversations, TOEIC, IELTS listening and more.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function BrowseFooter() {
  return (
    <div className="border-manga-black bg-manga-black text-manga-white border-t-3 px-5 py-4">
      <strong className="font-sans text-base font-black tracking-normal uppercase">
        English For Only Me
      </strong>
    </div>
  )
}

export default async function DictationPage() {
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
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle="Browse dictation topics"
          authControl={<AuthControl />}
        />
      }
      footer={<BrowseFooter />}
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <PageHero>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PageTag tone="red">Listening</PageTag>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {latestCompletedVideo ? (
                <MangaButton
                  href={`/dictation/videos/${latestCompletedVideo.id}/results`}
                  tone="primary"
                  className="bg-manga-paper-soft hover:bg-manga-pale-red min-h-10 px-3 py-1 text-xs"
                  icon={
                    <Trophy
                      aria-hidden="true"
                      className="size-4"
                    />
                  }
                >
                  View Latest Results
                </MangaButton>
              ) : null}
              <Link
                href="/dictation/favorites"
                className="text-manga-red text-sm font-black hover:underline"
              >
                ★ Favorites
              </Link>
            </div>
          </div>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
            All topics
          </h1>
          <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
            {hasPracticeActor
              ? 'Pick a topic, then a section, then continue building your listening history.'
              : 'Pick a topic, then a section, then practice a lesson. Sign in to save your progress and favorites.'}
          </p>
        </PageHero>
        <InProgressSection
          videos={inProgressItems}
          canFavorite={canFavorite}
        />
        <TopicGrid
          topics={topics}
          noTopicCount={noTopicCount}
        />
        {globalStats ? (
          <div className="border-manga-black/20 mt-4 border-t-2 pt-8">
            <DictationGlobalStats stats={globalStats} />
          </div>
        ) : null}
      </section>
    </MangaPageShell>
  )
}

import type { Metadata } from 'next'
import { Headphones, Trophy } from 'lucide-react'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { PageHeader } from '@/components/common/PageHeader'
import { InProgressSection } from '@/components/dictation/browse/InProgressSection'
import {
  finishedByTopic,
  NO_TOPIC_KEY,
  shelveTopics,
} from '@/components/dictation/browse/listeningJourney'
import {
  ListeningJourneyHero,
  type ListeningNextStop,
} from '@/components/dictation/browse/ListeningJourneyHero'
import {
  RecordShelves,
  type RecordTopic,
} from '@/components/dictation/browse/RecordShelves'
import { TopicGrid } from '@/components/dictation/browse/TopicGrid'
import { ActionButton } from '@/components/ui/ActionButton'
import { hasMongoDbUri } from '@/constants/environments'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import {
  getCachedNoTopicCount,
  getCachedTopicSummaries,
  getCachedVideoTopicIds,
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
  let doneByTopic = new Map<string, number>()

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
      videoTopicIds,
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
      getCachedVideoTopicIds(),
    ])

    topics = topicSummaries
    noTopicCount = noTopicVideos
    globalStats = stats
    latestCompletedVideo = latest
    doneByTopic = finishedByTopic(videoTopicIds, completionCounts)

    const favoritedSet = new Set(favoritedIds)
    const inProgressSet = new Set(inProgressVideos.map(video => video.id))

    inProgressItems = inProgressVideos.map(video =>
      toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
    )
  }

  // Every topic as a record; "Uncategorized" joins as a plain one.
  const recordTopics: RecordTopic[] = topics.map(topic => ({
    href: `/dictation/${topic.slug}`,
    id: topic.id,
    levelRange: topic.levelRange,
    thumbnailUrl: topic.thumbnailUrl ?? null,
    title: topic.title,
    total: topic.lessonCount,
  }))
  if (noTopicCount > 0)
    recordTopics.push({
      href: '/dictation/no-topic',
      id: NO_TOPIC_KEY,
      levelRange: null,
      muted: true,
      thumbnailUrl: null,
      title: t.dictation.browse.uncategorized,
      total: noTopicCount,
    })
  const shelves = shelveTopics(recordTopics, doneByTopic)
  // Next stop: the last video left half done, else the topic nearest gold,
  // else the first new one.
  const resume = inProgressItems.find(item => item.practiceHref)
  const nearGold = shelves.playing[0] ?? shelves.new[0]
  const nextStop: ListeningNextStop | null = resume?.practiceHref
    ? {
        detail: text.journeyResume,
        href: resume.practiceHref,
        kind: 'video',
        title: resume.title,
      }
    : nearGold
      ? {
          detail: format(t.dictation.journey.recordProgress, {
            done: nearGold.done,
            total: nearGold.total,
          }),
          href: nearGold.topic.href,
          kind: 'topic',
          title: nearGold.topic.title,
        }
      : null

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.dictation.meta.browseSubtitle}
        />
      }
    >
      <section className="grid gap-4 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          actions={
            <>
              {latestCompletedVideo ? (
                <ActionButton
                  href={`/dictation/videos/${latestCompletedVideo.id}/results`}
                  icon={
                    <Trophy
                      aria-hidden="true"
                      className="size-4"
                    />
                  }
                  tone="paper"
                >
                  {text.latestResults}
                </ActionButton>
              ) : null}
              <ActionButton href="/dictation/favorites">
                {text.favoritesLink}
              </ActionButton>
            </>
          }
          icon={<Headphones />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={
            hasPracticeActor ? text.descriptionSignedIn : text.descriptionGuest
          }
          title={text.title}
        />
        {globalStats ? (
          <ListeningJourneyHero
            labels={t.dictation}
            next={nextStop}
            stats={globalStats}
          />
        ) : null}
        <InProgressSection
          videos={inProgressItems}
          canFavorite={canFavorite}
          labels={t.dictation.browse}
        />
        <section
          aria-labelledby="dictation-topics-title"
          className="grid gap-3"
        >
          <h2
            className="font-sans text-lg font-medium"
            id="dictation-topics-title"
          >
            {text.topicsHeading}
          </h2>
          {recordTopics.length > 0 ? (
            <RecordShelves
              labels={t.dictation}
              shelves={shelves}
            />
          ) : (
            <TopicGrid
              labels={t.dictation.browse}
              noTopicCount={noTopicCount}
              topics={topics}
            />
          )}
        </section>
      </section>
    </PageShell>
  )
}

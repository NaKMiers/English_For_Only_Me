import { Headphones, SearchX } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { PageHeader } from '@/components/common/PageHeader'
import { BrowsePagination } from '@/components/dictation/browse/BrowsePagination'
import { BrowseToolbar } from '@/components/dictation/browse/BrowseToolbar'
import {
  BrowseVideoList,
  SectionAccordion,
} from '@/components/dictation/browse/SectionAccordion'
import {
  pickTopicNextVideo,
  TopicJourney,
} from '@/components/dictation/browse/TopicJourney'
import { EmptyState } from '@/components/journey/EmptyState'
import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { getMessages } from '@/i18n/server'
import { connectDatabase, connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import {
  isBrowseQueryActive,
  parseBrowseQuery,
} from '@/modules/dictation/content/browseQuery'
import { getCachedTopicCatalog } from '@/modules/dictation/content/catalogReaders'
import { searchVideosInTopic } from '@/modules/dictation/content/contentRepository'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import {
  getCompletionCountsForUser,
  getInProgressVideoIdsForUser,
} from '@/modules/dictation/content/progressRepository'
import { buildSectionGroups } from '@/modules/dictation/content/sectionGroups'
import {
  getOptionalUser,
  getPracticeActorId,
} from '@/modules/dictation/services/getCurrentUser'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PageProps {
  params: Promise<{ topicSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { topicSlug } = await params
  const t = await getMessages()

  if (!hasMongoDbUri()) return { title: topicSlug }

  // Shared with the page body through React cache(): one cache read.
  const topic = (await getCachedTopicCatalog(topicSlug))?.topic

  if (!topic) return { title: t.dictation.topic.notFound }

  const description =
    topic.description ??
    format(t.dictation.topic.metaDescription, { title: topic.title })
  const url = `${getSiteUrl()}/dictation/${topic.slug}`

  return {
    title: topic.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: topic.title,
      description,
      url,
      images: topic.thumbnailUrl ? [topic.thumbnailUrl] : undefined,
    },
  }
}

export default async function TopicPage({ params, searchParams }: PageProps) {
  const { topicSlug } = await params
  const query = parseBrowseQuery(await searchParams)

  if (!hasMongoDbUri()) notFound()

  const filtering = isBrowseQueryActive(query)

  // The catalog (topic, sections, videos) is one cached read. A connection is
  // opened, overlapping with it, only for what the cache cannot serve: the
  // practice actor's own rows, or a filtered search.
  const [catalog, user, actorId] = await Promise.all([
    getCachedTopicCatalog(topicSlug),
    getOptionalUser(),
    // Completion badges follow the practice actor (guest or user) so anonymous
    // progress shows up; favoriting stays login-only.
    connectDatabaseWhen(getPracticeActorId()),
    filtering ? connectDatabase() : null,
  ])

  if (!catalog) notFound()

  const { topic } = catalog
  const canFavorite = Boolean(user)

  const [favoritedIds, completionCounts, inProgressSet, searchResult] =
    await Promise.all([
      user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
      actorId
        ? getCompletionCountsForUser(actorId)
        : Promise.resolve<Map<string, number>>(new Map()),
      actorId
        ? getInProgressVideoIdsForUser(actorId)
        : Promise.resolve<Set<string>>(new Set()),
      filtering ? searchVideosInTopic(topic.id, query) : Promise.resolve(null),
    ])
  const favoritedSet = new Set(favoritedIds)
  const t = await getMessages()
  const labels = t.dictation.browse
  const groups = buildSectionGroups(
    catalog.sections.map(section => ({ id: section.id, title: section.title })),
    catalog.videos.map(video => ({
      ...toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet }),
      sectionId: video.sectionId,
    }))
  )
  const next = pickTopicNextVideo(groups)
  const breadcrumb = [
    { href: '/dictation', label: labels.allTopics },
    { label: topic.title },
  ]

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          page={{ breadcrumb, module: 'dictation', title: topic.title }}
          subtitle={t.dictation.meta.browseSubtitle}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{ items: breadcrumb, label: t.common.journey.breadcrumb }}
          icon={<Headphones />}
          iconClassName="bg-pastel-sky text-accent-blue"
          inTopbar
          subtitle={topic.description || undefined}
          title={topic.title}
        />

        <TopicJourney
          groups={groups}
          journey={t.common.journey}
          labels={t.dictation.topicJourney}
          next={next}
          thumbnailUrl={topic.thumbnailUrl ?? null}
          title={topic.title}
        />

        <BrowseToolbar
          search={query.search}
          level={query.level}
        />

        {searchResult ? (
          <FlatResults
            result={searchResult}
            query={query}
            basePath={`/dictation/${topic.slug}`}
            canFavorite={canFavorite}
            favoritedSet={favoritedSet}
            completionCounts={completionCounts}
            inProgressSet={inProgressSet}
            labels={labels}
          />
        ) : (
          <SectionAccordion
            groups={groups}
            canFavorite={canFavorite}
            labels={labels}
            openKey={next?.groupKey ?? null}
          />
        )}
      </section>
    </PageShell>
  )
}

function FlatResults({
  result: { videos, pagination },
  query,
  basePath,
  canFavorite,
  favoritedSet,
  completionCounts,
  inProgressSet,
  labels,
}: {
  result: Awaited<ReturnType<typeof searchVideosInTopic>>
  query: ReturnType<typeof parseBrowseQuery>
  basePath: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
  labels: Messages['dictation']['browse']
}) {
  const items = videos.map(video =>
    toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
  )

  return (
    <div className="grid gap-4">
      <p className="text-ink-soft text-sm font-medium">
        {plural(labels.lessons, pagination.total)}
      </p>
      {items.length === 0 ? (
        <EmptyState
          action={{ href: basePath, label: labels.clearFilters }}
          icon={<SearchX />}
          title={labels.noMatches}
        />
      ) : (
        <BrowseVideoList
          videos={items}
          canFavorite={canFavorite}
          labels={labels.card}
        />
      )}
      <BrowsePagination
        pagination={pagination}
        query={query}
        basePath={basePath}
        labels={labels}
      />
    </div>
  )
}

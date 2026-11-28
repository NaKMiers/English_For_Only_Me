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
import { requirePageUser } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
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

  // The catalog (topic, sections, videos) is one cached read. The connection
  // opens alongside it for what the cache cannot serve: the learner's own
  // rows and a filtered search.
  const [catalog, user] = await Promise.all([
    getCachedTopicCatalog(topicSlug),
    requirePageUser(),
    connectDatabase(),
  ])

  if (!catalog) notFound()

  const { topic } = catalog

  const [favoritedIds, completionCounts, inProgressSet, searchResult] =
    await Promise.all([
      listFavoriteVideoIds(user.id),
      getCompletionCountsForUser(user.id),
      getInProgressVideoIdsForUser(user.id),
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
          page={{
            breadcrumb,
            module: 'dictation',
            subtitle: topic.description || undefined,
            title: topic.title,
          }}
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
          // No Continue float over search results: it would jump to a card
          // the flat list may not show.
          next={searchResult ? null : next}
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
            favoritedSet={favoritedSet}
            completionCounts={completionCounts}
            inProgressSet={inProgressSet}
            labels={labels}
            nextId={next?.video.id ?? null}
          />
        ) : (
          <SectionAccordion
            groups={groups}
            labels={labels}
            nextId={next?.video.id ?? null}
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
  favoritedSet,
  completionCounts,
  inProgressSet,
  labels,
  nextId,
}: {
  result: Awaited<ReturnType<typeof searchVideosInTopic>>
  query: ReturnType<typeof parseBrowseQuery>
  basePath: string
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
  labels: Messages['dictation']['browse']
  /** The topic's next video: its card keeps the pink ring in the results. */
  nextId: string | null
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
          labels={labels.card}
          nextId={nextId}
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageHero } from '@/components/common/PageHero'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import { BrowsePagination } from '@/components/dictation/browse/BrowsePagination'
import { BrowseToolbar } from '@/components/dictation/browse/BrowseToolbar'
import {
  BrowseVideoList,
  SectionAccordion,
} from '@/components/dictation/browse/SectionAccordion'
import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { connectDatabase, connectDatabaseWhen } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import {
  isBrowseQueryActive,
  parseBrowseQuery,
} from '@/modules/dictation/content/browseQuery'
import {
  getCachedTopicCatalog,
  type TopicCatalog,
} from '@/modules/dictation/content/catalogReaders'
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

  if (!hasMongoDbUri()) return { title: topicSlug }

  // Shared with the page body through React cache(): one cache read.
  const topic = (await getCachedTopicCatalog(topicSlug))?.topic

  if (!topic) return { title: 'Topic not found' }

  const description =
    topic.description ?? `Dictation practice lessons in ${topic.title}.`
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <BrowseBreadcrumb current={topic.title} />
            <Link
              href="/dictation/favorites"
              className="text-manga-red text-sm font-black hover:underline"
            >
              ★ Favorites
            </Link>
          </div>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
            {topic.title}
          </h1>
          {topic.description && (
            <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
              {topic.description}
            </p>
          )}
        </PageHero>

        <BrowseToolbar
          search={query.search}
          level={query.level}
          sort={query.sort}
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
          />
        ) : (
          <TopicAccordion
            catalog={catalog}
            canFavorite={canFavorite}
            favoritedSet={favoritedSet}
            completionCounts={completionCounts}
            inProgressSet={inProgressSet}
          />
        )}
      </section>
    </MangaPageShell>
  )
}

function TopicAccordion({
  catalog: { sections, videos },
  canFavorite,
  favoritedSet,
  completionCounts,
  inProgressSet,
}: {
  catalog: TopicCatalog
  canFavorite: boolean
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
}) {
  const groups = buildSectionGroups(
    sections.map(section => ({ id: section.id, title: section.title })),
    videos.map(video => ({
      ...toBrowseItem(video, {
        completionCounts,
        favoritedSet,
        inProgressSet,
      }),
      sectionId: video.sectionId,
    }))
  )

  return (
    <SectionAccordion
      groups={groups}
      canFavorite={canFavorite}
    />
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
}: {
  result: Awaited<ReturnType<typeof searchVideosInTopic>>
  query: ReturnType<typeof parseBrowseQuery>
  basePath: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
}) {
  const items = videos.map(video =>
    toBrowseItem(video, { completionCounts, favoritedSet, inProgressSet })
  )

  return (
    <div className="grid gap-4">
      <p className="text-sm font-black opacity-80">
        {pagination.total} {pagination.total === 1 ? 'lesson' : 'lessons'}
      </p>
      <BrowseVideoList
        videos={items}
        canFavorite={canFavorite}
        emptyLabel="No lessons match. Clear the filters to see all."
      />
      <BrowsePagination
        pagination={pagination}
        query={query}
        basePath={basePath}
      />
    </div>
  )
}

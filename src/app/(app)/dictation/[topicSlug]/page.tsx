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
import { connectDatabase } from '@/lib/db/connectDatabase'
import { toBrowseItem } from '@/modules/dictation/content/browseItem'
import {
  isBrowseQueryActive,
  parseBrowseQuery,
} from '@/modules/dictation/content/browseQuery'
import {
  getTopicBySlug,
  listSectionsForTopic,
  listVideosForTopic,
  searchVideosInTopic,
} from '@/modules/dictation/content/contentRepository'
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

  await connectDatabase()
  const topic = await getTopicBySlug(topicSlug)

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

  await connectDatabase()
  const topic = await getTopicBySlug(topicSlug)

  if (!topic) notFound()

  const user = await getOptionalUser()
  const canFavorite = Boolean(user)
  // Completion badges follow the practice actor (guest or user) so anonymous
  // progress shows up; favoriting stays login-only.
  const actorId = await getPracticeActorId()
  const filtering = isBrowseQueryActive(query)

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

        {filtering ? (
          <FlatResults
            topicId={topic.id}
            query={query}
            basePath={`/dictation/${topic.slug}`}
            canFavorite={canFavorite}
            favoritedSet={favoritedSet}
            completionCounts={completionCounts}
            inProgressSet={inProgressSet}
          />
        ) : (
          <TopicAccordion
            topicId={topic.id}
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

async function TopicAccordion({
  topicId,
  canFavorite,
  favoritedSet,
  completionCounts,
  inProgressSet,
}: {
  topicId: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
}) {
  const [sections, videos] = await Promise.all([
    listSectionsForTopic(topicId),
    listVideosForTopic(topicId),
  ])

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

async function FlatResults({
  topicId,
  query,
  basePath,
  canFavorite,
  favoritedSet,
  completionCounts,
  inProgressSet,
}: {
  topicId: string
  query: ReturnType<typeof parseBrowseQuery>
  basePath: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completionCounts: Map<string, number>
  inProgressSet: Set<string>
}) {
  const { videos, pagination } = await searchVideosInTopic(topicId, query)
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

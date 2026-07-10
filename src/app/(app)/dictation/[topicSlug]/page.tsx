import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import { BrowsePagination } from '@/components/dictation/browse/BrowsePagination'
import { BrowseToolbar } from '@/components/dictation/browse/BrowseToolbar'
import {
  BrowseVideoList,
  SectionAccordion,
  type BrowseVideoItem,
} from '@/components/dictation/browse/SectionAccordion'
import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
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
import { listCompletedVideoIdsForUser } from '@/modules/dictation/content/progressRepository'
import { buildSectionGroups } from '@/modules/dictation/content/sectionGroups'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import type { DictationVideoApiRecord } from '@/modules/dictation/types'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PageProps {
  params: Promise<{ topicSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function toBrowseItem(
  video: DictationVideoApiRecord,
  favoritedSet: Set<string>,
  completedSet: Set<string>
): BrowseVideoItem {
  return {
    id: video.id,
    title: video.title,
    level: video.level,
    practiceHref: hasDictationTranscript(video)
      ? `/dictation/videos/${video.id}/practice`
      : null,
    favorited: favoritedSet.has(video.id),
    done: completedSet.has(video.id),
    thumbnailUrl: video.thumbnailUrl,
    youtubeVideoId: video.youtubeVideoId,
  }
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
  const filtering = isBrowseQueryActive(query)

  const [favoritedIds, completedIds] = await Promise.all([
    user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
    user
      ? listCompletedVideoIdsForUser(user.id)
      : Promise.resolve<string[]>([]),
  ])
  const favoritedSet = new Set(favoritedIds)
  const completedSet = new Set(completedIds)

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
        <BrowseBreadcrumb current={topic.title} />
        <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
          {topic.title}
        </h1>
        {topic.description && (
          <p className="text-manga-ink-soft max-w-2xl text-sm leading-6">
            {topic.description}
          </p>
        )}

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
            completedSet={completedSet}
          />
        ) : (
          <TopicAccordion
            topicId={topic.id}
            canFavorite={canFavorite}
            favoritedSet={favoritedSet}
            completedSet={completedSet}
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
  completedSet,
}: {
  topicId: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completedSet: Set<string>
}) {
  const [sections, videos] = await Promise.all([
    listSectionsForTopic(topicId),
    listVideosForTopic(topicId),
  ])

  const groups = buildSectionGroups(
    sections.map(section => ({ id: section.id, title: section.title })),
    videos.map(video => ({
      ...toBrowseItem(video, favoritedSet, completedSet),
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
  completedSet,
}: {
  topicId: string
  query: ReturnType<typeof parseBrowseQuery>
  basePath: string
  canFavorite: boolean
  favoritedSet: Set<string>
  completedSet: Set<string>
}) {
  const { videos, pagination } = await searchVideosInTopic(topicId, query)
  const items = videos.map(video =>
    toBrowseItem(video, favoritedSet, completedSet)
  )

  return (
    <div className="grid gap-4">
      <p className="text-manga-ink-soft text-sm font-black">
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

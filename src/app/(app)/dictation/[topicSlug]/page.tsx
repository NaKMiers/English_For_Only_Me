import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { BrowseBreadcrumb } from '@/components/dictation/browse/BrowseBreadcrumb'
import { SectionAccordion } from '@/components/dictation/browse/SectionAccordion'
import { getSiteUrl, hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  getTopicBySlug,
  listSectionsForTopic,
  listVideosForTopic,
} from '@/modules/dictation/content/contentRepository'
import { listFavoriteVideoIds } from '@/modules/dictation/content/favoriteRepository'
import { listCompletedVideoIdsForUser } from '@/modules/dictation/content/progressRepository'
import { buildSectionGroups } from '@/modules/dictation/content/sectionGroups'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'
import { hasDictationTranscript } from '@/modules/dictation/videoReadiness'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PageProps {
  params: Promise<{ topicSlug: string }>
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

export default async function TopicPage({ params }: PageProps) {
  const { topicSlug } = await params

  if (!hasMongoDbUri()) notFound()

  await connectDatabase()
  const topic = await getTopicBySlug(topicSlug)

  if (!topic) notFound()

  const user = await getOptionalUser()
  const canFavorite = Boolean(user)

  const [sections, videos, favoritedIds, completedIds] = await Promise.all([
    listSectionsForTopic(topic.id),
    listVideosForTopic(topic.id),
    user ? listFavoriteVideoIds(user.id) : Promise.resolve<string[]>([]),
    user
      ? listCompletedVideoIdsForUser(user.id)
      : Promise.resolve<string[]>([]),
  ])

  const favoritedSet = new Set(favoritedIds)
  const completedSet = new Set(completedIds)

  const groups = buildSectionGroups(
    sections.map(section => ({ id: section.id, title: section.title })),
    videos.map(video => ({
      id: video.id,
      title: video.title,
      level: video.level,
      sectionId: video.sectionId,
      practiceHref: hasDictationTranscript(video)
        ? `/dictation/videos/${video.id}/practice`
        : null,
      favorited: favoritedSet.has(video.id),
      done: completedSet.has(video.id),
    }))
  )

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
        <SectionAccordion
          groups={groups}
          canFavorite={canFavorite}
        />
      </section>
    </MangaPageShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AdminCreateTopicForm } from '@/components/dictation/admin/AdminCreateTopicForm'
import {
  type AdminSectionVideo,
  type AdminTopicData,
} from '@/components/dictation/admin/AdminTopicCard'
import { AdminTopicList } from '@/components/dictation/admin/AdminTopicList'
import { AdminUnassignedPanel } from '@/components/dictation/admin/AdminUnassignedPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  listNoTopicVideos,
  listSectionsForTopic,
  listTopics,
  listVideosForTopic,
} from '@/modules/dictation/content/contentRepository'

export const metadata: Metadata = { title: 'Admin · Topics' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function buildTopicData(): Promise<AdminTopicData[]> {
  const topics = await listTopics()

  return Promise.all(
    topics.map(async topic => {
      const [sections, videos] = await Promise.all([
        listSectionsForTopic(topic.id),
        listVideosForTopic(topic.id),
      ])

      const bySection = new Map<string, AdminSectionVideo[]>()
      const ungrouped: AdminSectionVideo[] = []

      for (const video of videos) {
        const item: AdminSectionVideo = {
          id: video.id,
          title: video.title,
          level: video.level,
          status: video.status,
          thumbnailUrl: video.thumbnailUrl,
          youtubeVideoId: video.youtubeVideoId,
        }
        if (video.sectionId) {
          const bucket = bySection.get(video.sectionId) ?? []
          bucket.push(item)
          bySection.set(video.sectionId, bucket)
        } else ungrouped.push(item)
      }

      return {
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        thumbnailUrl: topic.thumbnailUrl,
        order: topic.order,
        hasVideoMedia: topic.hasVideoMedia,
        videoCount: videos.length,
        sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          videos: bySection.get(section.id) ?? [],
        })),
        ungrouped,
      } satisfies AdminTopicData
    })
  )
}

export default async function AdminTopicsPage() {
  let topics: AdminTopicData[] = []
  let unassigned: AdminSectionVideo[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [topicData, noTopicVideos] = await Promise.all([
      buildTopicData(),
      listNoTopicVideos(),
    ])
    topics = topicData
    unassigned = noTopicVideos.map(video => ({
      id: video.id,
      title: video.title,
      level: video.level,
      status: video.status,
      thumbnailUrl: video.thumbnailUrl,
      youtubeVideoId: video.youtubeVideoId,
    }))
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          subtitle="Admin · Topics"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="page-hero flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-sans text-[clamp(1.6rem,4vw,2.4rem)] leading-none font-black uppercase">
            Topics
          </h1>
          <Link
            href="/admin"
            className="text-manga-red text-sm font-black hover:underline"
          >
            ← Admin
          </Link>
        </header>

        <AdminCreateTopicForm />

        <AdminUnassignedPanel videos={unassigned} />

        {topics.length === 0 ? (
          <p className="text-manga-ink-soft text-sm">
            No topics yet. Create one above.
          </p>
        ) : (
          <AdminTopicList topics={topics} />
        )}
      </section>
    </MangaPageShell>
  )
}

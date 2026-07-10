import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import {
  type AdminSectionVideo,
  type AdminTopicData,
} from '@/components/dictation/admin/AdminTopicCard'
import { AdminTopicList } from '@/components/dictation/admin/AdminTopicList'
import { AdminUnassignedPanel } from '@/components/dictation/admin/AdminUnassignedPanel'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { createTopicAction } from '@/modules/dictation/content/adminActions'
import {
  listNoTopicVideos,
  listSectionsForTopic,
  listTopics,
  listVideosForTopic,
} from '@/modules/dictation/content/contentRepository'

export const metadata: Metadata = { title: 'Admin · Topics' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const input =
  'border-manga-black min-h-11 rounded-none border-3 bg-manga-white px-3 py-2 font-sans text-base font-black'

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
        <header className="flex flex-wrap items-center justify-between gap-2">
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

        <form
          action={createTopicAction}
          className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
        >
          <h2 className="font-sans text-base font-black uppercase">
            New topic
          </h2>
          <Input
            name="title"
            placeholder="Title (e.g. Short Stories)"
            required
            className={input}
          />
          <Input
            name="description"
            placeholder="Description (optional)"
            className={input}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Label className="font-sans text-sm font-black">
              <Checkbox
                name="hasVideoMedia"
                value="on"
              />
              Video badge
            </Label>
            <MangaButton
              type="submit"
              tone="primary"
            >
              Create topic
            </MangaButton>
          </div>
        </form>

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

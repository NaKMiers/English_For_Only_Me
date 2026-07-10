import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import {
  AdminTopicCard,
  type AdminSectionVideo,
  type AdminTopicData,
} from '@/components/dictation/admin/AdminTopicCard'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { createTopicAction } from '@/modules/dictation/content/adminActions'
import {
  listSectionsForTopic,
  listTopics,
  listVideosForTopic,
} from '@/modules/dictation/content/contentRepository'

export const metadata: Metadata = { title: 'Admin · Topics' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const input =
  'border-manga-black border-3 bg-manga-white px-3 py-2 font-sans text-base font-black'
const submit =
  'border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-11 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'

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

  if (hasMongoDbUri()) {
    await connectDatabase()
    topics = await buildTopicData()
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
          <input
            name="title"
            placeholder="Title (e.g. Short Stories)"
            required
            className={input}
          />
          <input
            name="description"
            placeholder="Description (optional)"
            className={input}
          />
          <div className="flex flex-wrap items-center gap-4">
            <input
              name="order"
              type="number"
              placeholder="Order"
              defaultValue={0}
              className={`${input} w-28`}
            />
            <label className="flex items-center gap-2 font-sans text-sm font-black">
              <input
                type="checkbox"
                name="hasVideoMedia"
                className="size-5"
              />
              Video badge
            </label>
            <button
              type="submit"
              className={submit}
            >
              Create topic
            </button>
          </div>
        </form>

        <div className="grid gap-4">
          {topics.length === 0 ? (
            <p className="text-manga-ink-soft text-sm">
              No topics yet. Create one above.
            </p>
          ) : (
            topics.map(topic => (
              <AdminTopicCard
                key={topic.id}
                topic={topic}
              />
            ))
          )}
        </div>
      </section>
    </MangaPageShell>
  )
}

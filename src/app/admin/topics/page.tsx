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
  buildAdminTopicBoard,
  toAdminSectionVideo,
} from '@/modules/dictation/content/adminTopicBoard'
import {
  listAllSections,
  listFiledVideos,
  listNoTopicVideos,
  listTopics,
} from '@/modules/dictation/content/contentRepository'

export const metadata: Metadata = { title: 'Admin · Topics' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminTopicsPage() {
  let topics: AdminTopicData[] = []
  let unassigned: AdminSectionVideo[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    // Four flat queries, grouped in memory - not two queries per topic.
    const [topicRows, sections, filedVideos, noTopicVideos] = await Promise.all(
      [listTopics(), listAllSections(), listFiledVideos(), listNoTopicVideos()]
    )
    topics = buildAdminTopicBoard({
      sections,
      topics: topicRows,
      videos: filedVideos,
    })
    unassigned = noTopicVideos.map(toAdminSectionVideo)
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

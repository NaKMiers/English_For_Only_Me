import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import {
  VideoAssignTable,
  type AdminVideoRow,
} from '@/components/dictation/admin/VideoAssignTable'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  listAllSections,
  listManageableVideos,
  listTopics,
} from '@/modules/dictation/content/contentRepository'
import { LucideArrowLeft } from 'lucide-react'

export const metadata: Metadata = { title: 'Admin · Videos' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const actionLink =
  'border-manga-black bg-manga-paper-soft hover:bg-manga-pale-red inline-flex min-h-10 items-center border-3 px-4 font-sans text-sm font-black shadow-[3px_3px_0_var(--manga-black)]'

export default async function AdminVideosPage() {
  let rows: AdminVideoRow[] = []
  let topics: Array<{ id: string; title: string }> = []
  let sections: Array<{ id: string; topicId: string; title: string }> = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [videos, topicRecords, sectionRecords] = await Promise.all([
      listManageableVideos(),
      listTopics(),
      listAllSections(),
    ])

    const topicTitle = new Map(topicRecords.map(t => [t.id, t.title]))
    const sectionTitle = new Map(sectionRecords.map(s => [s.id, s.title]))

    topics = topicRecords.map(t => ({ id: t.id, title: t.title }))
    sections = sectionRecords.map(s => ({
      id: s.id,
      topicId: s.topicId,
      title: s.title,
    }))
    rows = videos.map(video => ({
      id: video.id,
      title: video.title,
      level: video.level,
      status: video.status,
      topicTitle: video.topicId
        ? (topicTitle.get(video.topicId) ?? null)
        : null,
      sectionTitle: video.sectionId
        ? (sectionTitle.get(video.sectionId) ?? null)
        : null,
      thumbnailUrl: video.thumbnailUrl,
      youtubeVideoId: video.youtubeVideoId,
      order: video.order,
    }))
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          subtitle="Admin · Videos"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="page-hero flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans text-[clamp(1.6rem,4vw,2.4rem)] leading-none font-black uppercase">
              Videos
            </h1>
            <Link
              href="/admin/import"
              className={actionLink}
            >
              Import video
            </Link>
          </div>
          <Link
            href="/admin"
            className="text-manga-red flex items-center gap-2 text-sm font-black hover:underline"
          >
            <LucideArrowLeft size={14} /> Admin
          </Link>
        </header>
        <p className="text-manga-ink-soft text-sm">
          Select videos, pick a topic/section/level, then assign. Assigning sets
          all three together.
        </p>
        <VideoAssignTable
          videos={rows}
          topics={topics}
          sections={sections}
        />
      </section>
    </MangaPageShell>
  )
}

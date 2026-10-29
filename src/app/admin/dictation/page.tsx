import { FolderTree, List, Upload } from 'lucide-react'
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
import {
  AdminTrashPanel,
  type AdminTrashVideo,
} from '@/components/dictation/admin/AdminTrashPanel'
import { AdminUnassignedPanel } from '@/components/dictation/admin/AdminUnassignedPanel'
import {
  VideoAssignTable,
  type AdminVideoRow,
} from '@/components/dictation/admin/VideoAssignTable'
import { MangaButton } from '@/components/ui/MangaButton'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { cn } from '@/lib/utils'
import { parseAdminVideoFilter } from '@/modules/dictation/content/adminVideoFilter'
import {
  buildAdminTopicBoard,
  toAdminSectionVideo,
} from '@/modules/dictation/content/adminTopicBoard'
import {
  listAllSections,
  listArchivedVideos,
  listFiledVideos,
  listManageableVideos,
  listNoTopicVideos,
  listTopics,
} from '@/modules/dictation/content/contentRepository'
import type {
  DictationSectionApiRecord,
  DictationTopicApiRecord,
  DictationVideoApiRecord,
} from '@/modules/dictation/types'

export const metadata: Metadata = { title: 'Admin · Dictation' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type View = 'topics' | 'list'

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const VIEWS: Array<{ Icon: typeof List; label: string; view: View }> = [
  { Icon: FolderTree, label: 'Topics & Sections', view: 'topics' },
  { Icon: List, label: 'List', view: 'list' },
]

function placementOf(
  video: DictationVideoApiRecord,
  topicTitle: Map<string, string>,
  sectionTitle: Map<string, string>
) {
  const topic = video.topicId ? topicTitle.get(video.topicId) : undefined
  if (!topic) return null

  const section = video.sectionId ? sectionTitle.get(video.sectionId) : null
  return section ? `${topic} · ${section}` : topic
}

/** Topics view: four flat queries, grouped in memory - not two per topic. */
async function loadTopicBoard(
  topicRows: DictationTopicApiRecord[],
  sections: DictationSectionApiRecord[]
) {
  const [filedVideos, noTopicVideos] = await Promise.all([
    listFiledVideos(),
    listNoTopicVideos(),
  ])

  return {
    topics: buildAdminTopicBoard({
      sections,
      topics: topicRows,
      videos: filedVideos,
    }),
    unassigned: noTopicVideos.map(toAdminSectionVideo),
  }
}

/**
 * The single dictation admin page: organize topics and sections, bulk-assign
 * videos in a flat list, import new ones and empty the trash. `?view=list`
 * picks the list; anything else shows topics. Only the open view's videos are
 * queried.
 */
export default async function AdminDictationPage({ searchParams }: Props) {
  const params = await searchParams
  const view: View = params.view === 'list' ? 'list' : 'topics'
  const initialFilter = parseAdminVideoFilter(
    new URLSearchParams(
      Object.entries(params).flatMap(([key, value]) =>
        typeof value === 'string' ? [[key, value]] : []
      )
    )
  )

  let topics: AdminTopicData[] = []
  let unassigned: AdminSectionVideo[] = []
  let rows: AdminVideoRow[] = []
  let topicOptions: Array<{ id: string; title: string }> = []
  let sectionOptions: Array<{ id: string; topicId: string; title: string }> = []
  let trash: AdminTrashVideo[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [topicRows, sections, archived] = await Promise.all([
      listTopics(),
      listAllSections(),
      listArchivedVideos(),
    ])

    const topicTitle = new Map(topicRows.map(t => [t.id, t.title]))
    const sectionTitle = new Map(sections.map(s => [s.id, s.title]))

    trash = archived.map(video => ({
      id: video.id,
      placement: placementOf(video, topicTitle, sectionTitle),
      thumbnailUrl: video.thumbnailUrl,
      title: video.title,
      youtubeVideoId: video.youtubeVideoId,
    }))

    if (view === 'topics') {
      ;({ topics, unassigned } = await loadTopicBoard(topicRows, sections))
    } else {
      const videos = await listManageableVideos()

      topicOptions = topicRows.map(t => ({ id: t.id, title: t.title }))
      sectionOptions = sections.map(s => ({
        id: s.id,
        topicId: s.topicId,
        title: s.title,
      }))
      rows = videos.map(video => ({
        id: video.id,
        title: video.title,
        channelTitle: video.channelTitle,
        level: video.level,
        status: video.status,
        createdAt: new Date(video.createdAt).getTime(),
        durationSeconds: video.durationSeconds,
        topicId: video.topicId,
        sectionId: video.sectionId,
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
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          subtitle="Admin · Dictation"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="page-hero grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-sans text-[clamp(1.6rem,4vw,2.4rem)] leading-none font-black uppercase">
              Dictation
            </h1>
            <Link
              href="/admin"
              className="text-manga-red text-sm font-black hover:underline"
            >
              ← Admin
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav
              aria-label="View"
              className="border-manga-black bg-manga-white rounded-control flex border-2 p-1"
            >
              {VIEWS.map(({ Icon, label, view: option }) => (
                <Link
                  key={option}
                  href={
                    option === 'list'
                      ? '/admin/dictation?view=list'
                      : '/admin/dictation'
                  }
                  aria-current={option === view ? 'page' : undefined}
                  className={cn(
                    'rounded-tag flex min-h-9 items-center gap-2 px-3 font-sans text-sm font-black transition-colors',
                    option === view
                      ? 'bg-manga-black text-manga-white'
                      : 'hover:bg-manga-paper-soft'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-4"
                  />
                  {label}
                </Link>
              ))}
            </nav>
            <MangaButton
              href="/admin/dictation/import"
              tone="ink"
              icon={<Upload aria-hidden="true" />}
            >
              Import video
            </MangaButton>
          </div>
        </header>

        {view === 'topics' ? (
          <>
            <AdminCreateTopicForm />

            <AdminUnassignedPanel videos={unassigned} />

            {topics.length === 0 ? (
              <p className="text-manga-ink-soft text-sm">
                No topics yet. Create one above.
              </p>
            ) : (
              <AdminTopicList topics={topics} />
            )}
          </>
        ) : (
          <>
            <VideoAssignTable
              initialFilter={initialFilter}
              videos={rows}
              topics={topicOptions}
              sections={sectionOptions}
            />
          </>
        )}

        <AdminTrashPanel videos={trash} />
      </section>
    </MangaPageShell>
  )
}

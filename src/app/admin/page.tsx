import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  countNoTopicVideos,
  listTopics,
} from '@/modules/dictation/content/contentRepository'

export const metadata: Metadata = { title: 'Admin' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LINKS = [
  {
    href: '/admin/topics',
    title: 'Topics & Sections',
    desc: 'Create and organize the content hierarchy.',
  },
  {
    href: '/admin/videos',
    title: 'Videos',
    desc: 'Assign videos to a topic, section, and level.',
  },
  {
    href: '/admin/import',
    title: 'Import',
    desc: 'Add a new YouTube source.',
  },
  {
    href: '/dictation/stats',
    title: 'Stats',
    desc: 'Practice stats dashboard.',
  },
]

export default async function AdminDashboard() {
  let topicCount = 0
  let uncategorized = 0

  if (hasMongoDbUri()) {
    await connectDatabase()
    const [topics, noTopic] = await Promise.all([
      listTopics(),
      countNoTopicVideos(),
    ])
    topicCount = topics.length
    uncategorized = noTopic
  }

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          subtitle="Admin"
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <header className="grid gap-2">
          <PageTag tone="ink">Admin</PageTag>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-black uppercase">
            Manage content
          </h1>
          <p className="text-manga-ink-soft text-sm">
            {topicCount} topics · {uncategorized} uncategorized videos
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="border-manga-black bg-manga-white hover:bg-manga-paper-soft grid gap-1 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]"
            >
              <span className="font-sans text-lg font-black">{link.title}</span>
              <span className="text-manga-ink-soft text-sm">{link.desc}</span>
            </Link>
          ))}
        </div>
      </section>
    </MangaPageShell>
  )
}

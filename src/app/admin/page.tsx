import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { PageHero } from '@/components/common/PageHero'
import { PageTag } from '@/components/ui/PageTag'
import { hasMongoDbUri } from '@/constants/environments'
import { plural, format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  countNoTopicVideos,
  listTopics,
} from '@/modules/dictation/content/contentRepository'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return { title: t.admin.dashboard.metaTitle }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const LINKS = [
  { href: '/admin/dictation', key: 'dictation' },
  { href: '/admin/ielts', key: 'ielts' },
  { href: '/admin/vocab', key: 'vocab' },
] as const

export default async function AdminDashboard() {
  const t = await getMessages()
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
    <PageShell
      topbar={
        <AppTopbar
          subtitle={t.admin.shell.admin}
          authControl={<AuthControl />}
        />
      }
    >
      <section className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <PageHero>
          <PageTag tone="ink">{t.admin.dashboard.tag}</PageTag>
          <h1 className="font-sans text-[clamp(1.8rem,4vw,2.6rem)] leading-none font-medium">
            {t.admin.dashboard.title}
          </h1>
          <p className="text-ink-soft text-sm">
            {format(t.admin.dashboard.stats, {
              topics: plural(t.admin.dashboard.topics, topicCount),
              uncategorized: plural(
                t.admin.dashboard.uncategorized,
                uncategorized
              ),
            })}
          </p>
        </PageHero>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="border-line bg-surface hover:bg-tint rounded-panel grid gap-1 border p-4"
            >
              <span className="font-sans text-lg font-semibold">
                {t.admin.dashboard.links[link.key].title}
              </span>
              <span className="text-ink-soft text-sm">
                {t.admin.dashboard.links[link.key].desc}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  )
}

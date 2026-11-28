import { BookA, GraduationCap, Headphones, Settings, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { PageHeader } from '@/components/common/PageHeader'
import { hasMongoDbUri } from '@/constants/environments'
import { MODULE_THEMES } from '@/constants/theme'
import { plural, format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { cn } from '@/lib/utils'
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
  {
    href: '/admin/dictation',
    icon: Headphones,
    key: 'dictation',
    ...MODULE_THEMES.dictation,
  },
  {
    href: '/admin/ielts',
    icon: GraduationCap,
    key: 'ielts',
    ...MODULE_THEMES.ielts,
  },
  {
    href: '/admin/vocab',
    icon: BookA,
    key: 'vocab',
    ...MODULE_THEMES.vocabulary,
  },
  {
    href: '/admin/users',
    icon: Users,
    key: 'users',
    tint: 'bg-pastel-rose',
    accent: 'text-accent-pink',
  },
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

  const stats = format(t.admin.dashboard.stats, {
    topics: plural(t.admin.dashboard.topics, topicCount),
    uncategorized: plural(t.admin.dashboard.uncategorized, uncategorized),
  })

  return (
    <PageShell
      topbar={
        // The title sits in the top row beside the brand, like every other
        // page; PageHeader inTopbar repeats it on phones only.
        <AppTopbar
          page={{ subtitle: stats, title: t.admin.dashboard.title }}
          subtitle={t.admin.shell.admin}
        />
      }
    >
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          eyebrow={t.admin.dashboard.tag}
          icon={<Settings />}
          iconClassName="bg-surface-muted text-ink"
          inTopbar
          subtitle={stats}
          title={t.admin.dashboard.title}
        />
        <div className="motion-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LINKS.map(link => {
            const Icon = link.icon

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'soft-press hover-pop rounded-panel grid content-start gap-3 p-4',
                  link.tint
                )}
              >
                <span
                  className={cn(
                    'bg-surface/80 grid size-11 place-items-center rounded-full',
                    link.accent
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5"
                  />
                </span>
                <span className="font-sans text-lg font-medium">
                  {t.admin.dashboard.links[link.key].title}
                </span>
                <span className="text-ink-soft text-sm">
                  {t.admin.dashboard.links[link.key].desc}
                </span>
              </Link>
            )
          })}
        </div>
      </section>
    </PageShell>
  )
}

import { UserRound } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { UserActions } from '@/components/admin/users/UserActions'
import { UserAvatar } from '@/components/admin/users/UserAvatar'
import {
  UserActivityChips,
  UserStatusBadges,
} from '@/components/admin/users/UserBadges'
import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { hasMongoDbUri } from '@/constants/environments'
import { getLocale, getMessages } from '@/i18n/server'
import { requireAdmin } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  formatCalendarDate,
  formatRelativeDate,
} from '@/modules/admin/users/formatUserDates'
import { getUserForAdmin } from '@/modules/admin/users/userAdminService'
import { managementBlock } from '@/modules/admin/users/userDirectory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ userId: string }>
}

async function loadUser(userId: string) {
  if (!hasMongoDbUri()) return null

  await connectDatabase()

  return getUserForAdmin(userId)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ userId }, t] = await Promise.all([
    params,
    getMessages(),
    requireAdmin(),
  ])
  const user = await loadUser(userId)

  return {
    title: user ? user.name || user.email : t.admin.users.metaTitle,
  }
}

/** One account: profile, practice per module and the lock / delete zone. */
export default async function AdminUserPage({ params }: Props) {
  const [{ userId }, t, locale, admin] = await Promise.all([
    params,
    getMessages(),
    getLocale(),
    requireAdmin(),
  ])
  const user = await loadUser(userId)

  if (!user) notFound()

  const text = t.admin.users
  // eslint-disable-next-line react-hooks/purity -- one timestamp per server render
  const now = Date.now()
  const facts = [
    {
      label: text.detail.joined,
      value: formatCalendarDate(user.createdAt, locale) ?? text.never,
    },
    {
      label: text.detail.lastLogin,
      value: formatRelativeDate(user.lastLoginAt, now, locale) ?? text.never,
    },
    ...(user.status === 'locked'
      ? [
          {
            label: text.detail.lockedSince,
            value: formatCalendarDate(user.lockedAt, locale) ?? text.never,
          },
        ]
      : []),
  ]

  return (
    <PageShell topbar={<AppTopbar subtitle={t.admin.shell.users} />}>
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/admin', label: t.admin.dashboard.title },
              { href: '/admin/users', label: text.title },
              { label: user.name || user.email },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<UserRound />}
          iconClassName="bg-pastel-sky text-accent-blue"
          title={user.name || user.email}
        />

        <div className="bg-surface border-line rounded-panel shadow-card flex flex-col gap-5 border p-5 sm:flex-row sm:items-center">
          <UserAvatar
            image={user.image}
            label={user.name || user.email}
            size="lg"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-ink truncate text-xl font-medium">
                {user.name || text.noName}
              </span>
              <UserStatusBadges user={user} />
            </div>
            <span className="text-ink-soft truncate text-sm">{user.email}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:gap-8">
            {facts.map(fact => (
              <div
                className="grid gap-0.5"
                key={fact.label}
              >
                <dt className="text-ink-soft text-xs">{fact.label}</dt>
                <dd className="text-ink text-sm font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <section className="grid gap-3">
          <h2 className="text-ink text-lg font-medium">
            {text.detail.practice}
          </h2>
          <UserActivityChips
            activity={user.activity}
            variant="full"
          />
        </section>

        <section className="bg-surface border-line rounded-panel shadow-card grid gap-4 border p-5">
          <h2 className="text-ink text-lg font-medium">{text.detail.manage}</h2>
          <UserActions
            block={managementBlock(user, admin.id)}
            user={user}
          />
        </section>
      </section>
    </PageShell>
  )
}

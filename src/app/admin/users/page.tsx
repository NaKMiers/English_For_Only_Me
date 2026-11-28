import { Users } from 'lucide-react'
import type { Metadata } from 'next'

import { UserDirectory } from '@/components/admin/users/UserDirectory'
import { AppTopbar } from '@/components/common/AppTopbar'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { hasMongoDbUri } from '@/constants/environments'
import { getMessages } from '@/i18n/server'
import { requireAdmin } from '@/lib/auth/currentUser'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { listUsersForAdmin } from '@/modules/admin/users/userAdminService'
import type { AdminUserRow } from '@/modules/admin/users/userDirectory'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return { title: t.admin.users.metaTitle }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Every account that has signed in, with search, sort and practice counts. */
export default async function AdminUsersPage() {
  // The admin layout and the proxy gate this page too, but layout and page
  // render in parallel: the page re-checks before reading any email.
  const [t] = await Promise.all([getMessages(), requireAdmin()])
  let users: AdminUserRow[] = []

  if (hasMongoDbUri()) {
    await connectDatabase()
    users = await listUsersForAdmin()
  }

  // One timestamp per server render, handed to the client so relative dates
  // agree on both sides.
  // eslint-disable-next-line react-hooks/purity -- see above
  const now = Date.now()

  return (
    <PageShell topbar={<AppTopbar subtitle={t.admin.shell.users} />}>
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/admin', label: t.admin.dashboard.title },
              { label: t.admin.users.title },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<Users />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={t.admin.users.subtitle}
          title={t.admin.users.title}
        />
        <UserDirectory
          now={now}
          users={users}
        />
      </section>
    </PageShell>
  )
}

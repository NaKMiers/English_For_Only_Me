import { Upload } from 'lucide-react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageHeader } from '@/components/common/PageHeader'
import { getMessages } from '@/i18n/server'
import { NON_ADMIN_HOME } from '@/lib/auth/auth.config'
import { requirePageUser } from '@/lib/auth/currentUser'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.admin.importPage.metaTitle,
    description: t.admin.importPage.metaDescription,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function DictationImportPage() {
  // Admin-only: importing creates shared catalog content. The proxy gates
  // /admin too; this guard keeps the redirect target exact.
  const user = await requirePageUser('/admin/dictation/import')
  if (user.role !== 'admin') redirect(NON_ADMIN_HOME)

  const t = await getMessages()

  return (
    <PageShell topbar={<AppTopbar subtitle={t.admin.shell.importDesk} />}>
      <section className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <PageHeader
          breadcrumb={{
            items: [
              { href: '/admin', label: t.admin.dashboard.title },
              {
                href: '/admin/dictation',
                label: t.common.modules.dictation.title,
              },
              { label: t.admin.importPage.title },
            ],
            label: t.common.journey.breadcrumb,
          }}
          icon={<Upload />}
          iconClassName="bg-pastel-sky text-accent-blue"
          subtitle={t.admin.importPage.intro}
          title={t.admin.importPage.title}
        />
        <div className="border-line bg-surface rounded-panel border p-4 sm:p-5">
          <DictationImportForm />
        </div>
      </section>
    </PageShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { AuthControl } from '@/components/common/AuthControl'
import { DictationImportForm } from '@/components/dictation/DictationImportForm'
import { PageTag } from '@/components/ui/PageTag'
import { getMessages } from '@/i18n/server'
import { getOptionalUser } from '@/modules/dictation/services/getCurrentUser'

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
  const user = await getOptionalUser()
  if (!user) redirect('/api/auth/signin?callbackUrl=/admin/dictation/import')
  if (user.role !== 'admin') redirect('/dictation')

  const t = await getMessages()

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/dictation"
          subtitle={t.admin.shell.importDesk}
          authControl={<AuthControl />}
        />
      }
      footer={
        <div className="border-line bg-cta text-cta-fg border-t px-5 py-4">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
            <strong className="font-sans text-base font-semibold tracking-normal">
              {t.common.app.name}
            </strong>
            <span className="text-tint-soft text-sm font-semibold">
              {t.admin.importPage.footerNote}
            </span>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 p-3 sm:p-5">
        <Link
          href="/admin/dictation"
          className="text-brand justify-self-start text-sm font-semibold hover:underline"
        >
          {t.admin.importPage.back}
        </Link>
        <section
          aria-labelledby="dictation-import-title"
          className="border-line bg-surface/92 rounded-panel grid min-w-0 overflow-hidden border"
        >
          <div className="border-line bg-surface/90 flex min-w-0 flex-wrap items-start justify-between gap-4 border-b p-4 sm:p-5">
            <div className="grid min-w-0 gap-3">
              <p className="text-brand text-xs leading-tight font-semibold tracking-normal">
                {t.admin.importPage.eyebrow}
              </p>
              <h1
                id="dictation-import-title"
                className="font-sans text-[clamp(2rem,7vw,4.75rem)] leading-none font-medium tracking-normal wrap-break-word"
              >
                {t.admin.importPage.title}
              </h1>
              <p className="text-ink-soft max-w-3xl text-base leading-7 font-normal">
                {t.admin.importPage.intro}
              </p>
            </div>
            <PageTag tone="red">{t.admin.importPage.tag}</PageTag>
          </div>

          <div className="p-4 sm:p-5">
            <DictationImportForm />
          </div>
        </section>
      </div>
    </PageShell>
  )
}

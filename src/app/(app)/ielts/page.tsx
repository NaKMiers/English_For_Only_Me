import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { PageShell } from '@/components/common/PageShell'
import { IeltsHome } from '@/components/ielts/catalogue/IeltsHome'
import { getMessages } from '@/i18n/server'
import { loadIeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.ielts.meta.homeTitle,
    description: t.ielts.meta.homeDescription,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function IeltsPage() {
  const [data, t] = await Promise.all([loadIeltsHomeData(), getMessages()])

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/ielts"
          authControl={<AuthControl />}
          subtitle={t.ielts.shell.subtitle}
        />
      }
    >
      <IeltsHome {...data} />
    </PageShell>
  )
}

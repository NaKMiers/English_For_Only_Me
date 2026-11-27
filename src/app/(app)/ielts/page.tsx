import type { Metadata } from 'next'
import { GraduationCap } from 'lucide-react'

import { AppTopbar } from '@/components/common/AppTopbar'
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
          aside={
            // The page heading lives up here from md, freeing the board for
            // the journey; phones keep it in the page (IeltsHome).
            <div className="flex items-center gap-3">
              <span className="grid text-right">
                <h1 className="font-sans text-2xl leading-tight font-medium tracking-tight">
                  {t.common.modules.ielts.title}
                </h1>
                <span className="text-ink-soft text-sm">
                  {t.ielts.home.intro}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="bg-pastel-peach text-accent-orange grid size-12 place-items-center rounded-full"
              >
                <GraduationCap className="size-6" />
              </span>
            </div>
          }
          subtitle={t.ielts.shell.subtitle}
        />
      }
    >
      <IeltsHome {...data} />
    </PageShell>
  )
}

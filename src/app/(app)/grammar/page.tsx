import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { PageShell } from '@/components/common/PageShell'
import { GrammarPath } from '@/components/grammar/path/GrammarPath'
import { format } from '@/i18n/format'
import { getMessages } from '@/i18n/server'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages()

  return {
    title: t.common.modules.grammar.title,
    description: t.grammar.meta.description,
  }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function GrammarPage() {
  const [{ path }, t] = await Promise.all([
    loadGrammarPageData(),
    getMessages(),
  ])

  return (
    <PageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          page={{
            module: 'grammar',
            subtitle: format(t.grammar.path.introShort, {
              count: path.totals.totalLessons,
            }),
            title: t.grammar.path.title,
          }}
          subtitle={t.grammar.subtitle}
        />
      }
    >
      <GrammarPath path={path} />
    </PageShell>
  )
}

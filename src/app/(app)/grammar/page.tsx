import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { GrammarPath } from '@/components/grammar/path/GrammarPath'
import { loadGrammarPageData } from '@/modules/grammar/services/grammarPageData'

export const metadata: Metadata = {
  title: 'Grammar',
  description:
    'A path of short Vietnamese-explained grammar lessons from A1 to C1, with stars, checkpoints, and spaced review.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function GrammarPage() {
  const { path } = await loadGrammarPageData()

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/grammar"
          authControl={<AuthControl />}
          subtitle="Lộ trình ngữ pháp A1 - C1"
        />
      }
    >
      <GrammarPath path={path} />
    </MangaPageShell>
  )
}

import type { Metadata } from 'next'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { IeltsHome } from '@/components/ielts/catalogue/IeltsHome'
import { loadIeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

export const metadata: Metadata = {
  title: 'IELTS Tests',
  description:
    'Original IELTS-style Listening, Reading and Writing tests with practice and timed mock modes, band estimates and evidence review.',
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function IeltsPage() {
  const data = await loadIeltsHomeData()

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          activeHref="/ielts"
          authControl={<AuthControl />}
          subtitle="Luyện đề IELTS: Listening, Reading, Writing"
        />
      }
    >
      <IeltsHome {...data} />
    </MangaPageShell>
  )
}

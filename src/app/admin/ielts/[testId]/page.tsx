import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { TestEditor } from '@/components/ielts/editor/TestEditor'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import {
  listIeltsSeries,
  readAdminTest,
} from '@/modules/ielts/tests/testService'

export const metadata: Metadata = { title: 'Admin · Edit IELTS test' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Props {
  params: Promise<{ testId: string }>
}

export default async function AdminIeltsEditorPage({ params }: Props) {
  const id = parseTestId((await params).testId)

  if (!id.ok || !hasMongoDbUri()) notFound()

  await connectDatabase()

  const [test, seriesOptions] = await Promise.all([
    readAdminTest(id.data),
    listIeltsSeries(),
  ])

  if (!test) notFound()

  // The shell grows with the editor and the page scrolls; `overflow-clip`
  // (not hidden) keeps the editor's sticky header bar working.
  return (
    <MangaPageShell
      className="overflow-clip"
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          compact
          subtitle="Admin · IELTS"
        />
      }
    >
      <TestEditor
        initial={test}
        key={test.id}
        seriesOptions={seriesOptions}
      />
    </MangaPageShell>
  )
}

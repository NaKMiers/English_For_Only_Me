import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { TestEditor } from '@/components/ielts/editor/TestEditor'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import { parseTestId } from '@/modules/ielts/tests/testRouteDecisions'
import { readAdminTest } from '@/modules/ielts/tests/testService'

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

  const test = await readAdminTest(id.data)

  if (!test) notFound()

  // The shell locks to the viewport: the editor and preview panes scroll on
  // their own under the header (the whole page scrolls below 1280px).
  return (
    <MangaPageShell
      fullHeight
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          subtitle="Admin · IELTS"
        />
      }
    >
      <TestEditor
        initial={test}
        key={test.id}
      />
    </MangaPageShell>
  )
}

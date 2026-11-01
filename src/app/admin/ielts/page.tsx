import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AdminTestCatalogue } from '@/components/ielts/editor/AdminTestCatalogue'
import { CreateTestPanel } from '@/components/ielts/editor/CreateTestPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  type IeltsAdminTestRow,
  listAdminTests,
} from '@/modules/ielts/tests/testService'
import { ExamCard, ExamSheet } from '@/components/ielts/ui'

export const metadata: Metadata = { title: 'Admin · IELTS' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AdminIeltsPage() {
  let tests: IeltsAdminTestRow[] = []
  let error = ''

  if (hasMongoDbUri())
    try {
      await connectDatabase()
      tests = await listAdminTests()
    } catch (caught) {
      console.error('admin ielts list failed', { caught })
      error = "Couldn't load the test list."
    }
  else error = 'Database is not configured.'

  const pageTitle = (
    <div className="grid min-w-0 gap-0.5">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground text-xs font-semibold"
      >
        <Link
          className="hover:text-manga-red underline"
          href="/admin"
        >
          Admin
        </Link>{' '}
        / IELTS
      </nav>
      <h1 className="font-sans text-2xl leading-none font-black wrap-break-word">
        IELTS Tests
      </h1>
    </div>
  )

  return (
    <MangaPageShell
      fullHeight="lg"
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          subtitle="Admin"
        />
      }
    >
      {/* From lg the page is one screen: the list and the form scroll inside
          their own cards. Smaller screens scroll the page as usual. */}
      <ExamSheet className="lg:h-full lg:grid-rows-[minmax(0,1fr)]">
        {/* items-start: the panel keeps its own height instead of stretching
            to the list column (that stretch split the extra height into the
            card's grid rows and pushed the form out of view). */}
        <div className="grid items-start gap-5 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)]">
          {error || tests.length === 0 ? (
            <ExamCard>
              {pageTitle}
              <p>{error || 'No tests yet. Create one manually or with AI.'}</p>
            </ExamCard>
          ) : (
            <ExamCard
              className="lg:h-full lg:grid-rows-[minmax(0,1fr)]"
              contentClassName="lg:min-h-0 lg:grid-rows-[minmax(0,1fr)]"
            >
              <AdminTestCatalogue
                tests={tests}
                title={pageTitle}
              />
            </ExamCard>
          )}
          <CreateTestPanel className="lg:max-h-full lg:overflow-y-auto" />
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

import { AppTopbar } from '@/components/common/AppTopbar'
import { AuthControl } from '@/components/common/AuthControl'
import { MangaPageShell } from '@/components/common/MangaPageShell'
import { AdminTestRow } from '@/components/ielts/editor/AdminTestRow'
import { CreateTestPanel } from '@/components/ielts/editor/CreateTestPanel'
import { hasMongoDbUri } from '@/constants/environments'
import { connectDatabase } from '@/lib/db/connectDatabase'
import {
  type IeltsAdminTestRow,
  listAdminTests,
} from '@/modules/ielts/tests/testService'
import { ExamBadge, ExamCard, ExamSheet, ExamHero } from '@/components/ielts/ui'

export const metadata: Metadata = { title: 'Admin · IELTS' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GROUPS = [
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['archived', 'Archived'],
] as const

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function readyCount(row: IeltsAdminTestRow) {
  return row.sections.filter(
    section => section.genStatus === 'ready' || section.genStatus === 'manual'
  ).length
}

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

  return (
    <MangaPageShell
      topbar={
        <AppTopbar
          authControl={<AuthControl />}
          subtitle="Admin"
        />
      }
    >
      <ExamSheet>
        <ExamHero>
          <nav
            aria-label="Breadcrumb"
            className="text-muted-foreground text-sm font-semibold"
          >
            <Link
              className="hover:text-manga-red underline"
              href="/admin"
            >
              Admin
            </Link>{' '}
            / IELTS
          </nav>
          <ExamBadge tone="ink">IELTS</ExamBadge>
          <h1 className="font-sans text-3xl leading-tight font-black wrap-break-word sm:text-4xl">
            IELTS Tests
          </h1>
        </ExamHero>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid content-start gap-5">
            {error ? (
              <ExamCard title="Error">
                <p>{error}</p>
              </ExamCard>
            ) : tests.length === 0 ? (
              <ExamCard title="No tests yet">
                <p>No tests yet. Create one manually or with AI.</p>
              </ExamCard>
            ) : (
              GROUPS.map(([status, label]) => {
                const rows = tests.filter(test => test.status === status)

                if (!rows.length) return null

                return (
                  <ExamCard
                    key={status}
                    title={`${label} (${rows.length})`}
                  >
                    <ul className="grid gap-2">
                      {rows.map(row => (
                        <AdminTestRow
                          key={row.id}
                          row={{
                            detail: `${row.slug} · ${row.source} · ${row.track}`,
                            id: row.id,
                            progress: `${readyCount(row)}/${row.sections.length} sections ready${
                              row.updatedAt
                                ? ` · ${dateFormat.format(new Date(row.updatedAt))}`
                                : ''
                            }`,
                            slug: row.slug,
                            status: row.status,
                            title: row.title,
                          }}
                        />
                      ))}
                    </ul>
                  </ExamCard>
                )
              })
            )}
          </div>
          <CreateTestPanel />
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}

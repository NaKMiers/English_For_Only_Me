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
import { ExamCard, ExamSheet } from '@/components/ielts/ui'
import { groupCatalogue } from '@/components/ielts/catalogue/catalogueGroups'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { IeltsTestStatus } from '@/modules/ielts/constants'

export const metadata: Metadata = { title: 'Admin · IELTS' }
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GROUPS = [
  ['draft', 'Drafts'],
  ['published', 'Published'],
  ['archived', 'Archived'],
] as const

/**
 * Ink when active, like the module's other segmented toggles. The `!` marks
 * beat the base trigger's line-variant and dark-mode colours, which otherwise
 * turn an idle tab transparent and the active one grey.
 */
const TAB_TRIGGER_CLASS =
  'group/tab border-manga-black! bg-manga-white! text-manga-black! hover:not-data-active:bg-manga-pale-red! data-active:bg-manga-black! data-active:text-manga-white! focus-visible:ring-manga-red/40 rounded-control sticker-press !h-auto min-h-10 min-w-0 flex-1 gap-1.5 border-2 px-2 font-sans text-xs font-black opacity-100! shadow-[2px_2px_0_var(--manga-black)] after:hidden data-active:translate-x-[2px] data-active:translate-y-[2px] data-active:shadow-none sm:flex-none sm:gap-2 sm:px-3 sm:text-sm'

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function readyCount(row: IeltsAdminTestRow) {
  return row.sections.filter(section => section.ready).length
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

  const groups = Object.fromEntries(
    GROUPS.map(([status]) => [
      status,
      tests.filter(test => test.status === status),
    ])
  ) as Record<IeltsTestStatus, IeltsAdminTestRow[]>

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
              <Tabs
                className="min-w-0 gap-4 lg:min-h-0"
                defaultValue={
                  GROUPS.find(([status]) => groups[status].length)?.[0] ??
                  'draft'
                }
              >
                {/* The page title shares its row with the tabs. */}
                <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                  {pageTitle}
                  <TabsList
                    aria-label="Tests by status"
                    className="h-auto! w-full justify-start gap-2 p-0 sm:w-auto"
                    variant="line"
                  >
                    {GROUPS.map(([status, label]) => (
                      <TabsTrigger
                        className={TAB_TRIGGER_CLASS}
                        key={status}
                        value={status}
                      >
                        {label}
                        <span className="rounded-tag bg-manga-black text-manga-white group-data-active/tab:bg-manga-white group-data-active/tab:text-manga-black min-w-6 px-1.5 py-0.5 text-center text-xs tabular-nums">
                          {groups[status].length}
                        </span>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {GROUPS.map(([status, label]) => (
                  <TabsContent
                    className="min-w-0 lg:min-h-0"
                    key={status}
                    value={status}
                  >
                    {groups[status].length ? (
                      // From md up a long tab scrolls in place, snapping to
                      // each series; a phone keeps the plain page scroll.
                      <div className="grid content-start gap-4 md:max-h-[min(40rem,70vh)] md:snap-y md:snap-proximity md:overflow-y-auto md:overscroll-contain md:pr-2 md:pb-1 lg:h-full lg:max-h-none">
                        {groupCatalogue(groups[status]).map(series => (
                          <section
                            aria-label={series.heading}
                            className="grid snap-start gap-2"
                            key={series.heading}
                          >
                            <h2 className="flex items-baseline gap-2 font-sans text-sm font-black uppercase">
                              {series.heading}
                              <span className="text-muted-foreground text-xs normal-case">
                                {series.tests.length}{' '}
                                {series.tests.length === 1 ? 'test' : 'tests'}
                              </span>
                            </h2>
                            <ul className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
                              {series.tests.map(({ entry, label: short }) => (
                                <AdminTestRow
                                  key={entry.id}
                                  row={{
                                    detail: `${entry.slug} · ${entry.source} · ${entry.track}`,
                                    id: entry.id,
                                    label: short,
                                    ready: readyCount(entry),
                                    slug: entry.slug,
                                    status: entry.status,
                                    title: entry.title,
                                    total: entry.sections.length,
                                    updated: entry.updatedAt
                                      ? dateFormat.format(
                                          new Date(entry.updatedAt)
                                        )
                                      : '',
                                  }}
                                />
                              ))}
                            </ul>
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground rounded-control bg-manga-paper-soft p-4 text-sm font-semibold">
                        No {label.toLowerCase()} tests.
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </ExamCard>
          )}
          <CreateTestPanel className="lg:max-h-full lg:overflow-y-auto" />
        </div>
      </ExamSheet>
    </MangaPageShell>
  )
}

'use client'

import { useState, type ReactNode } from 'react'

import { CatalogueToolbar } from '@/components/ielts/catalogue/CatalogueToolbar'
import {
  matchesCatalogueSearch,
  sortCatalogue,
  type CatalogueSort,
} from '@/components/ielts/catalogue/catalogueFilters'
import { groupCatalogue } from '@/components/ielts/catalogue/catalogueGroups'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLocale, useMessages } from '@/i18n/client'
import { INTL_LOCALES } from '@/i18n/config'
import { plural } from '@/i18n/format'
import type { IeltsTestStatus } from '@/modules/ielts/constants'
import type { IeltsAdminTestRow } from '@/modules/ielts/tests/testService'

import { AdminTestRow } from './AdminTestRow'

const GROUPS = ['draft', 'published', 'archived'] as const

const SORT_OPTIONS: CatalogueSort[] = ['newest', 'oldest', 'updated', 'title']

/**
 * Ink when active, like the module's other segmented toggles. The `!` marks
 * beat the base trigger's line-variant and dark-mode colours, which otherwise
 * turn an idle tab transparent and the active one grey.
 */
const TAB_TRIGGER_CLASS =
  'group/tab border-line! bg-surface! text-ink! hover:not-data-active:bg-tint-soft! data-active:bg-ink! data-active:text-surface! focus-visible:ring-brand/40 rounded-control soft-press !h-auto min-h-10 min-w-0 flex-1 gap-1.5 border px-2 font-sans text-xs font-semibold opacity-100! after:hidden data-active:shadow-none sm:flex-none sm:gap-2 sm:px-3 sm:text-sm'

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}

function readyCount(row: IeltsAdminTestRow) {
  return row.sections.filter(section => section.ready).length
}

/**
 * The admin test list: status tabs, then one toolbar (search, sort, filter)
 * that narrows every tab at once, so the tab counts show what is left.
 */
export function AdminTestCatalogue({
  tests,
  title,
}: {
  tests: IeltsAdminTestRow[]
  title: ReactNode
}) {
  const t = useMessages()
  const locale = useLocale()
  const copy = t.ieltsEditor.catalogue
  const dateFormat = new Intl.DateTimeFormat(INTL_LOCALES[locale], DATE_FORMAT)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<CatalogueSort>('newest')
  const [track, setTrack] = useState('all')
  const [readiness, setReadiness] = useState('all')

  const visible = sortCatalogue(
    tests.filter(test => {
      if (track !== 'all' && test.track !== track) return false
      if (readiness !== 'all') {
        const complete = readyCount(test) === test.sections.length
        if (complete !== (readiness === 'ready')) return false
      }

      return matchesCatalogueSearch(test, query)
    }),
    sort
  )
  const groups = Object.fromEntries(
    GROUPS.map(status => [
      status,
      visible.filter(test => test.status === status),
    ])
  ) as Record<IeltsTestStatus, IeltsAdminTestRow[]>
  const narrowed = visible.length !== tests.length

  return (
    <Tabs
      className="min-w-0 gap-3 lg:min-h-0"
      defaultValue={
        GROUPS.find(status => tests.some(test => test.status === status)) ??
        'draft'
      }
    >
      {/* The page title shares its row with the tabs. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        {title}
        <TabsList
          aria-label={copy.byStatus}
          className="h-auto! w-full justify-start gap-2 p-0 sm:w-auto"
          variant="line"
        >
          {GROUPS.map(status => (
            <TabsTrigger
              className={TAB_TRIGGER_CLASS}
              key={status}
              value={status}
            >
              {copy.groups[status]}
              <span className="rounded-tag bg-ink text-surface group-data-active/tab:bg-surface group-data-active/tab:text-ink min-w-6 px-1.5 py-0.5 text-center text-xs tabular-nums">
                {groups[status].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <CatalogueToolbar
        filters={[
          {
            id: 'track',
            label: t.ieltsEditor.fields.track,
            onChange: setTrack,
            options: [
              { value: 'all', label: copy.allTracks },
              { value: 'academic', label: t.ieltsEditor.tracks.academic },
              { value: 'general', label: t.ieltsEditor.tracks.general },
            ],
            value: track,
          },
          {
            id: 'readiness',
            label: copy.sections,
            onChange: setReadiness,
            options: [
              { value: 'all', label: copy.any },
              { value: 'ready', label: copy.allReady },
              { value: 'incomplete', label: copy.incomplete },
            ],
            value: readiness,
          },
        ]}
        onQueryChange={setQuery}
        onSortChange={setSort}
        query={query}
        sort={sort}
        sortOptions={SORT_OPTIONS}
      />
      {GROUPS.map(status => (
        <TabsContent
          className="min-w-0 lg:min-h-0"
          key={status}
          value={status}
        >
          {groups[status].length ? (
            // From md up a long tab scrolls in place, snapping to each
            // series; a phone keeps the plain page scroll.
            <div className="grid content-start gap-4 md:max-h-[min(40rem,70vh)] md:snap-y md:snap-proximity md:overflow-y-auto md:overscroll-contain md:pr-2 md:pb-1 lg:h-full lg:max-h-none">
              {groupCatalogue(groups[status]).map(series => (
                <section
                  aria-label={series.heading}
                  className="grid snap-start gap-2"
                  key={series.heading}
                >
                  <h2 className="flex items-baseline gap-2 font-sans text-sm font-semibold">
                    {series.heading}
                    <span className="text-muted-foreground text-xs normal-case">
                      {plural(copy.testCount, series.tests.length)}
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
                            ? dateFormat.format(new Date(entry.updatedAt))
                            : '',
                        }}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-control bg-tint p-4 text-sm font-semibold">
              {narrowed ? copy.noMatch[status] : copy.empty[status]}
            </p>
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}

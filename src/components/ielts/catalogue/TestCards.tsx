'use client'

import {
  BookMarked,
  BookOpen,
  ChevronRight,
  Headphones,
  PenLine,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import { IELTS_SKILL_LABELS, IELTS_SKILLS } from '@/modules/ielts/constants'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import { CatalogueToolbar, type CatalogueFilter } from './CatalogueToolbar'
import {
  matchesCatalogueSearch,
  sortCatalogue,
  type CatalogueSort,
} from './catalogueFilters'
import { groupCatalogue } from './catalogueGroups'

interface Props {
  /** Best band per skill for tests already done, keyed by test id. */
  bands: IeltsTestBands
  catalog: IeltsCatalogEntry[]
}

const SKILL_ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
} as const

// No "updated" option: learners never see edits, only new tests.
const SORT_OPTIONS: CatalogueSort[] = ['newest', 'oldest', 'title']

/**
 * The catalogue as books of test cards: a heading per series ("IELTS 21
 * Academic"), then one card per test. The whole card is one link to the test
 * page, where the learner picks a skill and practice or timed mode; the skill
 * icons only show what the test contains. Newest tests come first; the
 * toolbar searches, re-sorts and filters by type and skill. A skill the
 * learner already has a band on shows that best band next to its icon.
 */
export function TestCards({ bands, catalog }: Props) {
  const t = useMessages().ielts
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<CatalogueSort>('newest')
  const [track, setTrack] = useState('all')
  const [skill, setSkill] = useState('all')
  const tracks = [...new Set(catalog.map(entry => entry.track))]
  const skills = IELTS_SKILLS.filter(value =>
    catalog.some(entry => entry.skills.some(item => item.skill === value))
  )
  const visible = sortCatalogue(
    catalog.filter(
      entry =>
        (track === 'all' || entry.track === track) &&
        (skill === 'all' || entry.skills.some(item => item.skill === skill)) &&
        matchesCatalogueSearch(entry, query)
    ),
    sort
  )
  const filters: CatalogueFilter[] = []

  if (tracks.length > 1)
    filters.push({
      id: 'track',
      label: t.catalogue.testType,
      onChange: setTrack,
      options: [
        { value: 'all', label: t.catalogue.allTypes },
        ...tracks.map(value => ({ value, label: t.tracks[value] })),
      ],
      value: track,
    })
  if (skills.length > 1)
    filters.push({
      id: 'skill',
      label: t.catalogue.hasSkill,
      onChange: setSkill,
      options: [
        { value: 'all', label: t.catalogue.anySkill },
        ...skills.map(value => ({ value, label: IELTS_SKILL_LABELS[value] })),
      ],
      value: skill,
    })

  return (
    <div className="grid gap-4">
      <CatalogueToolbar
        className="max-w-2xl"
        filters={filters}
        onQueryChange={setQuery}
        onSortChange={setSort}
        query={query}
        sort={sort}
        sortOptions={SORT_OPTIONS}
      />

      {visible.length === 0 ? (
        <p className="text-ink-soft rounded-control bg-tint-soft p-4 text-sm">
          {t.catalogue.noMatch}
        </p>
      ) : null}

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {groupCatalogue(visible).map(group => (
          <section
            aria-label={group.heading}
            className="border-line bg-surface rounded-panel shadow-card grid gap-3 border p-3 sm:p-4"
            key={group.heading}
          >
            {/* One card per book: its name, then its tests as tiles. */}
            <header className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="bg-pastel-peach text-accent-orange grid size-10 shrink-0 place-items-center rounded-full"
              >
                <BookMarked className="size-5" />
              </span>
              <h2 className="min-w-0 flex-1 truncate font-sans text-base font-medium">
                {group.heading}
              </h2>
              <span className="text-ink-soft bg-surface-muted shrink-0 rounded-full px-2.5 py-0.5 text-xs tabular-nums">
                {group.tests.length}
              </span>
            </header>
            <ul className="motion-stagger grid grid-cols-2 gap-2 sm:grid-cols-4">
              {group.tests.map(({ entry, label }) => (
                <li key={entry.id}>
                  <Link
                    className="bg-surface-muted hover:bg-pastel-peach/60 rounded-control soft-press hover-lift grid h-full content-between gap-2.5 p-3"
                    href={`/ielts/${entry.slug}`}
                    title={entry.title}
                  >
                    <span className="flex items-center justify-between gap-2 font-sans text-sm font-medium">
                      {label}
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0"
                      />
                    </span>
                    <span className="text-ink-soft flex flex-wrap items-center gap-1.5">
                      {entry.skills.map(({ skill }) => {
                        const Icon = SKILL_ICONS[skill]
                        const band = bands[entry.id]?.[skill]

                        if (band === undefined)
                          return (
                            <span
                              className="border-line grid size-7 place-items-center rounded-full border"
                              key={skill}
                              title={IELTS_SKILL_LABELS[skill]}
                            >
                              <Icon
                                aria-label={IELTS_SKILL_LABELS[skill]}
                                className="size-3.5"
                              />
                            </span>
                          )

                        const bestBand = format(t.catalogue.bestBand, {
                          band: band.toFixed(1),
                          skill: IELTS_SKILL_LABELS[skill],
                        })

                        return (
                          <span
                            aria-label={bestBand}
                            className="bg-pastel-peach text-accent-orange inline-flex h-7 items-center gap-1 rounded-full px-2"
                            key={skill}
                            title={bestBand}
                          >
                            <Icon
                              aria-hidden="true"
                              className="size-3.5"
                            />
                            <span className="font-sans text-xs font-medium tabular-nums">
                              {band.toFixed(1)}
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

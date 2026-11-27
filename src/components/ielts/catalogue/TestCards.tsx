'use client'

import { BookOpen, ChevronRight, Headphones, PenLine } from 'lucide-react'
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
    <div className="grid gap-6">
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
        <p className="text-ink-soft rounded-control bg-tint p-4 text-sm font-normal">
          {t.catalogue.noMatch}
        </p>
      ) : null}

      {groupCatalogue(visible).map(group => (
        <section
          aria-label={group.heading}
          className="grid gap-3"
          key={group.heading}
        >
          {/* No colour class: it inherits the shell's ink (cream on the dark
              light-up room). Red reads as an error here. */}
          <h2 className="font-sans text-lg font-semibold">{group.heading}</h2>
          <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tests.map(({ entry, label }) => (
              <li key={entry.id}>
                <Link
                  className="border-line bg-surface hover:bg-tint-soft rounded-panel soft-press hover-lift grid gap-2 border px-4 py-3"
                  href={`/ielts/${entry.slug}`}
                  title={entry.title}
                >
                  <span className="flex items-center justify-between gap-2 font-sans text-base font-semibold">
                    {label}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    />
                  </span>
                  <span className="text-ink-soft flex flex-wrap items-center gap-x-3 gap-y-1">
                    {entry.skills.map(({ skill }) => {
                      const Icon = SKILL_ICONS[skill]
                      const band = bands[entry.id]?.[skill]

                      if (band === undefined)
                        return (
                          <Icon
                            aria-label={IELTS_SKILL_LABELS[skill]}
                            className="size-4"
                            key={skill}
                          />
                        )

                      const bestBand = format(t.catalogue.bestBand, {
                        band: band.toFixed(1),
                        skill: IELTS_SKILL_LABELS[skill],
                      })

                      return (
                        <span
                          aria-label={bestBand}
                          className="bg-ink text-surface rounded-tag inline-flex items-center gap-1 px-1.5 py-0.5"
                          key={skill}
                          title={bestBand}
                        >
                          <Icon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          <span className="font-sans text-xs font-semibold tabular-nums">
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
  )
}

'use client'

import { BookOpen, ChevronRight, Headphones, PenLine } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { IELTS_SKILL_LABELS, type IeltsTrack } from '@/modules/ielts/constants'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import { groupCatalogue, TRACK_LABELS } from './catalogueGroups'

interface Props {
  catalog: IeltsCatalogEntry[]
}

const SKILL_ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
} as const

/**
 * The catalogue as books of test cards: a heading per series ("IELTS 21
 * Academic"), then one card per test. The whole card is one link to the test
 * page, where the learner picks a skill and practice or timed mode; the skill
 * icons only show what the test contains.
 */
export function TestCards({ catalog }: Props) {
  const [track, setTrack] = useState<IeltsTrack | 'all'>('all')
  const tracks = [...new Set(catalog.map(entry => entry.track))]
  const visible =
    track === 'all' ? catalog : catalog.filter(entry => entry.track === track)

  return (
    <div className="grid gap-6">
      {tracks.length > 1 ? (
        // Segmented filter (aria-pressed): the documented raw-button exception.
        <div
          aria-label="Filter by test type"
          className="border-manga-black bg-manga-white rounded-control flex justify-self-start border-2 p-1"
          role="group"
        >
          {(['all', ...tracks] as const).map(value => (
            <button
              aria-pressed={track === value}
              className={cn(
                'rounded-tag min-h-8 px-3 font-sans text-sm font-black transition-colors',
                track === value
                  ? 'bg-manga-black text-manga-white'
                  : 'hover:bg-manga-paper-soft'
              )}
              key={value}
              onClick={() => setTrack(value)}
              type="button"
            >
              {value === 'all' ? 'All' : TRACK_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}

      {groupCatalogue(visible).map(group => (
        <section
          aria-label={group.heading}
          className="grid gap-3"
          key={group.heading}
        >
          <h2 className="text-manga-red font-sans text-lg font-black">
            {group.heading}
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.tests.map(({ entry, label }) => (
              <li key={entry.id}>
                <Link
                  className="border-manga-black bg-manga-white hover:bg-manga-pale-red rounded-panel sticker-press grid gap-2 border-2 px-4 py-3 shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  href={`/ielts/${entry.slug}`}
                  title={entry.title}
                >
                  <span className="flex items-center justify-between gap-2 font-sans text-base font-black">
                    {label}
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0"
                    />
                  </span>
                  <span className="text-manga-ink-soft flex items-center gap-2">
                    {entry.skills.map(({ skill }) => {
                      const Icon = SKILL_ICONS[skill]

                      return (
                        <Icon
                          aria-label={IELTS_SKILL_LABELS[skill]}
                          className="size-4"
                          key={skill}
                        />
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

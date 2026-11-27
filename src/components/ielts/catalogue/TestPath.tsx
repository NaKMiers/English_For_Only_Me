'use client'

import { CircleCheck, CircleDashed, MapPin, Trophy } from 'lucide-react'
import Link from 'next/link'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import { sortCatalogue } from './catalogueFilters'
import { groupCatalogue } from './catalogueGroups'
import { SkillPips } from './SkillPips'
import {
  groupProgress,
  HERE_STATION_ID,
  pickNextTest,
  testNodeState,
} from './testPath'

interface Props {
  /** Best band per skill for tests already done, keyed by test id. */
  bands: IeltsTestBands
  catalog: IeltsCatalogEntry[]
}

/** One colour per book line, cycled, like the lines of a metro map. */
const LINE_TONES = [
  {
    dot: 'bg-accent-orange',
    fill: 'bg-accent-orange text-surface',
    ring: 'border-accent-orange/70',
    soft: 'bg-pastel-peach/70',
    text: 'text-accent-orange',
  },
  {
    dot: 'bg-accent-blue',
    fill: 'bg-accent-blue text-surface',
    ring: 'border-accent-blue/70',
    soft: 'bg-pastel-sky/70',
    text: 'text-accent-blue',
  },
  {
    dot: 'bg-accent-purple',
    fill: 'bg-accent-purple text-surface',
    ring: 'border-accent-purple/70',
    soft: 'bg-pastel-lilac/70',
    text: 'text-accent-purple',
  },
  {
    dot: 'bg-accent-green',
    fill: 'bg-accent-green text-surface',
    ring: 'border-accent-green/70',
    soft: 'bg-pastel-mint/70',
    text: 'text-accent-green',
  },
  {
    dot: 'bg-accent-pink',
    fill: 'bg-accent-pink text-surface',
    ring: 'border-accent-pink/70',
    soft: 'bg-pastel-rose/70',
    text: 'text-accent-pink',
  },
] as const

/**
 * The catalogue as a metro map. Each book ("IELTS 21 Academic") is one
 * coloured line; each test is a station on it whose skill lights turn on as
 * the learner earns bands; the line fills up to the stations already
 * cleared and ends in the book's trophy. The next test to do wears a "You
 * are here" pin. A station is one link to the test page, where the learner
 * picks a skill and practice or timed mode. No search or filters: the
 * lines themselves are the way to browse.
 */
export function TestPath({ bands, catalog }: Props) {
  const t = useMessages().ielts
  // Newest books first, the same order the journey card reads.
  const groups = groupCatalogue(sortCatalogue(catalog, 'newest'))
  const next = pickNextTest(groups, bands)

  return (
    <div className="grid gap-4">
      <div className="motion-stagger grid gap-4">
        {groups.map((group, groupIndex) => {
          const tone = LINE_TONES[groupIndex % LINE_TONES.length]
          const progress = groupProgress(group, bands)
          const cleared = progress.total > 0 && progress.done === progress.total

          return (
            <section
              aria-label={group.heading}
              className="border-line bg-surface rounded-panel grid gap-3 border p-3 sm:p-4"
              key={group.heading}
            >
              <header className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn('size-3 shrink-0 rounded-full', tone.dot)}
                />
                <h2 className="min-w-0 flex-1 truncate font-sans text-base font-medium">
                  {group.heading}
                </h2>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums',
                    progress.done > 0 ? tone.soft : 'bg-surface-muted',
                    progress.done > 0 ? tone.text : 'text-ink-soft'
                  )}
                >
                  {format(t.journey.bookProgress, progress)}
                </span>
              </header>

              {/* The line: stations joined by track, ending in the trophy.
                  Scrolls sideways when a book has more tests than fit. */}
              <ol className="-mx-3 flex snap-x items-center overflow-x-auto px-3 pt-7 pb-2 sm:-mx-4 sm:px-4">
                {group.tests.map(({ entry, label }, index) => {
                  const state = testNodeState(entry, bands)
                  const here = next?.entry.id === entry.id
                  const previousDone =
                    index > 0 &&
                    testNodeState(group.tests[index - 1].entry, bands) ===
                      'done'
                  const doneSkills = entry.skills.filter(
                    ({ skill }) => bands[entry.id]?.[skill] !== undefined
                  ).length

                  return (
                    <li
                      className="flex shrink-0 snap-start items-center"
                      key={entry.id}
                    >
                      {index > 0 ? (
                        <Track
                          filled={previousDone}
                          tone={tone.dot}
                        />
                      ) : null}
                      <Link
                        aria-label={format(t.journey.station[state], {
                          done: doneSkills,
                          test: `${group.heading} ${label}`,
                          total: entry.skills.length,
                        })}
                        className={cn(
                          'soft-press hover-pop relative grid w-36 gap-2.5 rounded-[22px] border-2 p-3',
                          state === 'done'
                            ? cn(tone.soft, tone.ring)
                            : state === 'partial'
                              ? cn('bg-surface', tone.ring)
                              : 'bg-surface-muted border-line',
                          here && 'ring-brand/35 ring-4'
                        )}
                        href={`/ielts/${entry.slug}`}
                        id={here ? HERE_STATION_ID : undefined}
                        title={entry.title}
                      >
                        {here ? (
                          <span className="bg-brand text-surface absolute -top-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap shadow-sm motion-safe:animate-bounce">
                            <MapPin
                              aria-hidden="true"
                              className="size-3"
                            />
                            {t.journey.youAreHere}
                          </span>
                        ) : null}
                        <span className="flex items-center justify-between gap-2 font-sans text-sm font-medium">
                          <span className="truncate">{label}</span>
                          {state === 'done' ? (
                            <CircleCheck
                              aria-hidden="true"
                              className={cn('size-4 shrink-0', tone.text)}
                            />
                          ) : state === 'partial' ? (
                            <CircleDashed
                              aria-hidden="true"
                              className={cn('size-4 shrink-0', tone.text)}
                            />
                          ) : null}
                        </span>
                        <SkillPips
                          bands={bands}
                          bestBandLabel={t.catalogue.bestBand}
                          entry={entry}
                          fill={tone.fill}
                        />
                      </Link>
                    </li>
                  )
                })}
                <li className="flex shrink-0 items-center">
                  <Track
                    filled={
                      group.tests.length > 0 &&
                      testNodeState(group.tests.at(-1)!.entry, bands) === 'done'
                    }
                    tone={tone.dot}
                  />
                  <span
                    aria-label={format(t.journey.bookTrophy, {
                      book: group.heading,
                      ...progress,
                    })}
                    className={cn(
                      'grid size-14 shrink-0 place-items-center rounded-full border-2',
                      cleared
                        ? 'bg-pastel-lemon text-accent-orange border-accent-orange/60 shadow-sm'
                        : 'bg-surface-muted text-ink-soft/60 border-line border-dashed'
                    )}
                    role="img"
                  >
                    <Trophy
                      aria-hidden="true"
                      className="size-6"
                    />
                  </span>
                </li>
              </ol>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** The rail between two stations: solid in the line's colour once the
 * station before it is cleared, a dashed track before. */
function Track({ filled, tone }: { filled: boolean; tone: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'mx-1 block w-8 shrink-0 rounded-full sm:w-12',
        filled
          ? cn('h-1.5', tone)
          : 'border-line-strong h-0 border-t-2 border-dashed'
      )}
    />
  )
}

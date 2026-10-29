'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import {
  IELTS_SKILL_LABELS,
  type IeltsSkill,
  type IeltsTrack,
} from '@/modules/ielts/constants'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'
import { ExamButton } from '@/components/ielts/ui'

interface Props {
  attempts: IeltsAttemptSummary[]
  catalog: IeltsCatalogEntry[]
}

const TRACK_LABELS: Record<IeltsTrack, string> = {
  academic: 'Academic',
  general: 'General',
}

/** Latest full-skill band per test and skill, or null. */
function latestBand(
  attempts: IeltsAttemptSummary[],
  slug: string,
  skill: IeltsSkill
) {
  return (
    attempts.find(
      attempt =>
        attempt.testSlug === slug &&
        attempt.skill === skill &&
        attempt.part === null &&
        attempt.band !== null
    )?.band ?? null
  )
}

/** Dense rows, not a card grid: title, track, target, L/R/W chips, open. */
export function TestRows({ attempts, catalog }: Props) {
  const [track, setTrack] = useState<IeltsTrack | 'all'>('all')
  const tracks = [...new Set(catalog.map(entry => entry.track))]
  const visible =
    track === 'all' ? catalog : catalog.filter(entry => entry.track === track)

  return (
    <div className="grid gap-3">
      {tracks.length > 1 ? (
        // Segmented filter (aria-pressed): the documented raw-button exception.
        <div
          aria-label="Lọc theo loại đề"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {(['all', ...tracks] as const).map(value => (
            <button
              aria-pressed={track === value}
              className={cn(
                'border-ex-line min-h-9 rounded-lg border px-3 font-sans text-sm font-bold',
                track === value
                  ? 'bg-ex-accent text-white'
                  : 'hover:bg-ex-soft bg-white'
              )}
              key={value}
              onClick={() => setTrack(value)}
              type="button"
            >
              {value === 'all' ? 'Tất cả' : TRACK_LABELS[value]}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="grid gap-2">
        {visible.map(entry => (
          <li
            className="border-ex-line grid gap-3 rounded-lg border bg-white px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center"
            key={entry.id}
          >
            <div className="grid min-w-0 gap-1">
              <p className="font-sans font-bold">{entry.title}</p>
              <p className="text-ex-muted text-sm">
                {TRACK_LABELS[entry.track]} · mục tiêu {entry.targetBand}
                {entry.description ? ` · ${entry.description}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {entry.skills.map(({ skill }) => {
                const band = latestBand(attempts, entry.slug, skill)

                return (
                  <span
                    className="border-ex-line inline-flex min-h-7 items-center gap-1 rounded-md border px-2 font-sans text-xs font-bold"
                    key={skill}
                    title={IELTS_SKILL_LABELS[skill]}
                  >
                    {IELTS_SKILL_LABELS[skill][0]}
                    <span className="tabular-nums">
                      {band === null ? '-' : band.toFixed(1)}
                    </span>
                  </span>
                )
              })}
            </div>
            <ExamButton
              href={`/ielts/${entry.slug}`}
              tone="ink"
            >
              Mở
            </ExamButton>
          </li>
        ))}
      </ul>
    </div>
  )
}

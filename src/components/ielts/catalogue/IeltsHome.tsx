import { Settings } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import {
  IELTS_QUESTION_TYPE_LABELS,
  IELTS_SKILL_LABELS,
} from '@/modules/ielts/constants'
import type { IeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

import { AttemptHistory } from './AttemptHistory'
import { DrillButton } from './DrillButton'
import { TestCards } from './TestCards'
import {
  ExamButton,
  ExamCard,
  ExamSheet,
  ExamHero,
} from '@/components/ielts/ui'

/** Most-missed question types; hidden until there is enough data to rank. */
function WeaknessMap({ weakness }: Pick<IeltsHomeData, 'weakness'>) {
  if (!weakness || weakness.weakest.length === 0) return null

  return (
    <ExamCard
      eyebrow="Weak spots"
      title="Most-missed question types"
    >
      <ul className="grid gap-4">
        {weakness.weakest.map(row => {
          const percent = Math.round((row.accuracy ?? 0) * 100)

          return (
            <li
              className="grid gap-2"
              key={`${row.skill}-${row.type}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  <strong className="font-sans font-black">
                    {IELTS_QUESTION_TYPE_LABELS[row.type]}
                  </strong>{' '}
                  · {IELTS_SKILL_LABELS[row.skill]} · {row.correct}/{row.total}{' '}
                  correct
                </span>
                <DrillButton
                  skill={row.skill}
                  type={row.type}
                />
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  aria-label={`${percent}% correct`}
                  className="flex-1"
                  value={percent}
                />
                <span className="w-12 text-right font-sans text-sm font-black tabular-nums">
                  {percent}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </ExamCard>
  )
}

/**
 * The IELTS landing page, kept to one job: pick a test and a skill. A short
 * header with the band estimate, the test cards, then weak spots (once there
 * is data) and history. Unfinished attempts are not surfaced here.
 */
export function IeltsHome({
  attempts,
  catalog,
  error,
  isAdmin,
  overall,
  weakness,
}: IeltsHomeData) {
  return (
    <ExamSheet>
      <ExamHero className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <h1 className="font-sans text-3xl leading-tight font-black sm:text-4xl">
            IELTS Tests
          </h1>
          <p className="text-manga-ink-soft text-sm">
            Pick a test, then choose a skill.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {overall ? (
            <div
              className="border-manga-black bg-manga-paper-soft rounded-control flex items-baseline gap-2 border-2 px-3 py-1.5"
              title={`Estimate from ${overall.skills.length} ${overall.skills.length === 1 ? 'skill' : 'skills'}`}
            >
              <span className="font-sans text-[11px] font-black uppercase">
                Band
              </span>
              <strong className="font-sans text-2xl leading-none font-black tabular-nums">
                {overall.band.toFixed(1)}
              </strong>
            </div>
          ) : null}
          {isAdmin ? (
            <ExamButton
              className="min-h-10 px-3"
              href="/admin/ielts"
              icon={
                <Settings
                  aria-hidden="true"
                  className="size-4"
                />
              }
              tone="paper"
            >
              Manage
            </ExamButton>
          ) : null}
        </div>
      </ExamHero>

      {error ? (
        <ExamCard title="Could not load tests">
          <p>{error}</p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            Try again
          </ExamButton>
        </ExamCard>
      ) : catalog.length ? (
        <TestCards catalog={catalog} />
      ) : (
        <ExamCard title="No tests yet">
          <p>
            {isAdmin ? 'Create the first test.' : 'New tests will appear here.'}
          </p>
          {isAdmin ? (
            <ExamButton
              href="/admin/ielts"
              tone="ink"
            >
              Create test
            </ExamButton>
          ) : null}
        </ExamCard>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <WeaknessMap weakness={weakness} />
        <AttemptHistory attempts={attempts} />
      </div>

      <p className="text-muted-foreground text-xs">
        Bands are estimates from common conversion tables, not official scores.
      </p>
    </ExamSheet>
  )
}

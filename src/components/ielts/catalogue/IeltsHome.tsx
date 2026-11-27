import { Settings } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import {
  IELTS_QUESTION_TYPE_LABELS,
  IELTS_SKILL_LABELS,
} from '@/modules/ielts/constants'
import type { IeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

import { AttemptHistory } from './AttemptHistory'
import { DrillButton } from './DrillButton'
import { OverviewPanel } from './OverviewPanel'
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
    <section className="grid min-w-0 content-start gap-2">
      <h2 className="font-sans text-sm font-semibold">
        Most-missed question types
      </h2>
      {/* One line per type: name, accuracy bar, percent, drill. */}
      <ul className="grid gap-1.5">
        {weakness.weakest.map(row => {
          const percent = Math.round((row.accuracy ?? 0) * 100)

          return (
            <li
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              key={`${row.skill}-${row.type}`}
            >
              <span className="min-w-0 flex-1 basis-56">
                <strong className="font-sans font-semibold">
                  {IELTS_QUESTION_TYPE_LABELS[row.type]}
                </strong>{' '}
                <span className="text-muted-foreground">
                  · {IELTS_SKILL_LABELS[row.skill]} · {row.correct}/{row.total}
                </span>
              </span>
              <Progress
                aria-label={`${percent}% correct`}
                className="w-24"
                value={percent}
              />
              <span className="w-9 text-right font-sans font-semibold tabular-nums">
                {percent}%
              </span>
              <DrillButton
                compact
                skill={row.skill}
                type={row.type}
              />
            </li>
          )
        })}
      </ul>
    </section>
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
  testBands,
  weakness,
}: IeltsHomeData) {
  const hasProgress =
    Boolean(weakness?.weakest.length) ||
    attempts.some(attempt => attempt.status !== 'in_progress')

  return (
    <ExamSheet>
      {/* One panel: the header line, then weak spots and recent attempts,
          which fold away under the header's chevron. */}
      <ExamHero className="gap-0">
        <OverviewPanel
          actions={
            <>
              {overall ? (
                <div
                  className="border-line bg-tint rounded-control flex items-baseline gap-1.5 border px-2.5 py-1"
                  title={`Estimate from ${overall.skills.length} ${overall.skills.length === 1 ? 'skill' : 'skills'}`}
                >
                  <span className="font-sans text-[11px] font-semibold">
                    Band
                  </span>
                  <strong className="font-sans text-lg leading-none font-semibold tabular-nums">
                    {overall.band.toFixed(1)}
                  </strong>
                </div>
              ) : null}
              {isAdmin ? (
                <ExamButton
                  className="min-h-9 px-3"
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
            </>
          }
          heading={
            <>
              <h1 className="font-sans text-2xl leading-tight font-semibold">
                IELTS Tests
              </h1>
              <p className="text-ink-soft hidden text-sm sm:block">
                Pick a test, then choose a skill.
              </p>
            </>
          }
        >
          {hasProgress ? (
            <div className="border-line/20 mt-3 grid gap-x-6 gap-y-4 border-t pt-3 xl:grid-cols-2">
              <WeaknessMap weakness={weakness} />
              <AttemptHistory attempts={attempts} />
            </div>
          ) : null}
        </OverviewPanel>
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
        <TestCards
          bands={testBands}
          catalog={catalog}
        />
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

      <p className="text-muted-foreground text-xs">
        Bands are estimates from common conversion tables, not official scores.
      </p>
    </ExamSheet>
  )
}

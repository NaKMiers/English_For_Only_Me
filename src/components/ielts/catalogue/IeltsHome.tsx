import { ArrowRight, PlayCircle } from 'lucide-react'

import { Progress } from '@/components/ui/progress'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import {
  IELTS_QUESTION_TYPE_LABELS,
  IELTS_SKILL_LABELS,
} from '@/modules/ielts/constants'
import type { IeltsHomeData } from '@/modules/ielts/services/ieltsPageData'

import { AttemptHistory } from './AttemptHistory'
import { DrillButton } from './DrillButton'
import { TestRows } from './TestRows'
import {
  ExamBadge,
  ExamButton,
  ExamCard,
  ExamSheet,
  ExamHero,
} from '@/components/ielts/ui'

const MODE_LABELS = { practice: 'Practice', mock: 'Mock', drill: 'Drill' }

export function attemptHref(attempt: IeltsAttemptSummary) {
  if (attempt.status !== 'in_progress') return `/ielts/attempts/${attempt.id}`

  if (attempt.mode === 'drill') return `/ielts/drill/${attempt.id}`

  const base = `/ielts/${attempt.testSlug}/${attempt.skill}`
  const path = attempt.mode === 'mock' ? `${base}/mock` : base

  return attempt.part ? `${path}?part=${attempt.part}` : path
}

function minutesLeft(deadlineAt: string | null) {
  if (!deadlineAt) return null

  return Math.max(
    0,
    Math.round((new Date(deadlineAt).getTime() - Date.now()) / 60000)
  )
}

function ContinueStrip({ attempts }: { attempts: IeltsAttemptSummary[] }) {
  if (!attempts.length) return null

  return (
    <section
      aria-label="Unfinished attempts"
      className="grid gap-2"
    >
      {attempts.slice(0, 3).map(attempt => {
        const left = minutesLeft(attempt.deadlineAt)

        return (
          <div
            className="border-manga-black rounded-control bg-manga-white flex flex-wrap items-center gap-3 border-2 px-4 py-3"
            key={attempt.id}
          >
            <PlayCircle
              aria-hidden="true"
              className="size-5 shrink-0"
            />
            <p className="min-w-0 flex-1">
              <strong className="font-sans font-black">
                {attempt.testTitle || attempt.testSlug}
              </strong>{' '}
              · {IELTS_SKILL_LABELS[attempt.skill]}
              {attempt.part ? ` part ${attempt.part}` : ''} ·{' '}
              {MODE_LABELS[attempt.mode]}
              {left !== null ? ` · ${left} min left` : ''}
            </p>
            <ExamButton
              href={attemptHref(attempt)}
              tone="ink"
            >
              Continue
            </ExamButton>
          </div>
        )
      })}
    </section>
  )
}

function WeaknessMap({ weakness }: Pick<IeltsHomeData, 'weakness'>) {
  return (
    <ExamCard
      eyebrow="Weak spots"
      title="Most-missed question types"
    >
      {!weakness || weakness.weakest.length === 0 ? (
        <p>
          Not enough data yet (needs at least 5 questions per type). Take one
          more test to see your weak spots.
        </p>
      ) : (
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
                    · {IELTS_SKILL_LABELS[row.skill]} · {row.correct}/
                    {row.total} correct
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
      )}
    </ExamCard>
  )
}

export function IeltsHome({
  attempts,
  catalog,
  error,
  isAdmin,
  overall,
  weakness,
}: IeltsHomeData) {
  const open = attempts.filter(
    attempt =>
      attempt.status === 'in_progress' &&
      (!attempt.deadlineAt || new Date(attempt.deadlineAt) > new Date())
  )

  return (
    <ExamSheet>
      <ExamHero className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <ExamBadge tone="pale">IELTS</ExamBadge>
          <h1 className="font-sans text-3xl leading-tight font-black wrap-break-word sm:text-4xl">
            IELTS Tests
          </h1>
          <p className="max-w-2xl">
            Listening, Reading and Writing: practise one section or take a timed
            mock test, get a band score and see the evidence in the text.
          </p>
        </div>
        <div className="border-manga-black bg-manga-paper-soft rounded-panel grid gap-1 border-3 px-4 py-3 shadow-[4px_4px_0_var(--manga-black)]">
          <span className="font-sans text-xs font-black uppercase">
            Current estimate
            {overall
              ? ` (${overall.skills.length} ${overall.skills.length === 1 ? 'skill' : 'skills'})`
              : ''}
          </span>
          <strong className="font-sans text-3xl leading-none font-black tabular-nums">
            {overall ? overall.band.toFixed(1) : '-'}
          </strong>
        </div>
      </ExamHero>

      <ContinueStrip attempts={open} />

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
      ) : (
        <ExamCard
          action={
            isAdmin ? (
              <ExamButton
                href="/admin/ielts"
                icon={
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4"
                  />
                }
                tone="paper"
              >
                Manage tests
              </ExamButton>
            ) : null
          }
          eyebrow="Tests"
          title="Choose a test"
        >
          {catalog.length ? (
            <TestRows
              attempts={attempts}
              catalog={catalog}
            />
          ) : (
            <div className="grid gap-3">
              <p>{isAdmin ? 'No tests yet.' : 'New tests will appear here.'}</p>
              {isAdmin ? (
                <ExamButton
                  href="/admin/ielts"
                  tone="ink"
                >
                  Create test
                </ExamButton>
              ) : null}
            </div>
          )}
        </ExamCard>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <WeaknessMap weakness={weakness} />
        <AttemptHistory attempts={attempts} />
      </div>

      <p className="text-muted-foreground text-sm">
        Bands are estimates from common conversion tables, not official scores.
      </p>
    </ExamSheet>
  )
}

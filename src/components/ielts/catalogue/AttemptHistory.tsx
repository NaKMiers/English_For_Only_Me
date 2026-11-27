import Link from 'next/link'

import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'

import { DeleteAttemptButton } from './DeleteAttemptButton'

const MODE_LABELS = { practice: 'Practice', mock: 'Mock', drill: 'Drill' }
const STATUS_LABELS = {
  in_progress: 'In progress',
  submitted: 'Submitted',
  scored: 'Scored',
  expired: 'Time up',
}

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

export function AttemptHistory({
  attempts,
}: {
  attempts: IeltsAttemptSummary[]
}) {
  const finished = attempts.filter(attempt => attempt.status !== 'in_progress')

  // Nothing finished yet: no card, the test cards are the call to action.
  if (finished.length === 0) return null

  return (
    <section className="grid min-w-0 content-start gap-2">
      <h2 className="font-sans text-sm font-semibold">
        Recent attempts{' '}
        <span className="text-muted-foreground tabular-nums">
          ({finished.length})
        </span>
      </h2>
      {/* About six rows tall, then it scrolls; the column names stay. */}
      <div>
        <div className="max-h-64 overflow-auto overscroll-contain">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead className="bg-surface sticky top-0 z-10">
              <tr className="border-line border-b font-sans text-xs">
                <th
                  className="py-1 pr-2"
                  scope="col"
                >
                  Date
                </th>
                <th
                  className="py-1 pr-2"
                  scope="col"
                >
                  Test
                </th>
                <th
                  className="py-1 pr-2"
                  scope="col"
                >
                  Skill
                </th>
                <th
                  className="py-1 pr-2"
                  scope="col"
                >
                  Score
                </th>
                <th
                  className="py-1 pr-2"
                  scope="col"
                >
                  Band
                </th>
                <th
                  // Pinned right: the table scrolls sideways on phones.
                  className="bg-surface sticky right-0 w-8 py-1"
                  scope="col"
                >
                  <span className="sr-only">Delete</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {finished.map(attempt => (
                <tr
                  className="border-line/20 border-b"
                  key={attempt.id}
                >
                  <td className="py-1 pr-2 tabular-nums">
                    {dateFormat.format(new Date(attempt.startedAt))}
                  </td>
                  <td className="py-1 pr-2">
                    <Link
                      className="font-semibold underline"
                      href={`/ielts/attempts/${attempt.id}`}
                    >
                      {attempt.testTitle || attempt.testSlug || 'Drill'}
                    </Link>
                  </td>
                  <td className="py-1 pr-2">
                    {IELTS_SKILL_LABELS[attempt.skill]}
                    {attempt.part ? ` P${attempt.part}` : ''} ·{' '}
                    {MODE_LABELS[attempt.mode]}
                  </td>
                  <td className="py-1 pr-2 tabular-nums">
                    {attempt.raw !== null
                      ? `${attempt.raw}/${attempt.total}`
                      : STATUS_LABELS[attempt.status]}
                  </td>
                  <td className="py-1 pr-2 font-sans font-semibold tabular-nums">
                    {attempt.band === null ? '-' : attempt.band.toFixed(1)}
                  </td>
                  <td className="bg-surface sticky right-0 py-0.5">
                    <DeleteAttemptButton
                      attemptId={attempt.id}
                      label={`${attempt.testTitle || attempt.testSlug || 'Drill'} · ${IELTS_SKILL_LABELS[attempt.skill]}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'

import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import { ExamCard } from '@/components/ielts/ui'

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

  return (
    <ExamCard
      eyebrow="History"
      title="Attempt history"
    >
      {finished.length === 0 ? (
        <p>No attempts yet. Try a test.</p>
      ) : (
        <details>
          <summary className="cursor-pointer font-sans text-sm font-black">
            {finished.length} recent{' '}
            {finished.length === 1 ? 'attempt' : 'attempts'}
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-manga-black border-b-2 font-sans text-xs uppercase">
                  <th
                    className="py-1.5 pr-2"
                    scope="col"
                  >
                    Date
                  </th>
                  <th
                    className="py-1.5 pr-2"
                    scope="col"
                  >
                    Test
                  </th>
                  <th
                    className="py-1.5 pr-2"
                    scope="col"
                  >
                    Skill
                  </th>
                  <th
                    className="py-1.5 pr-2"
                    scope="col"
                  >
                    Score
                  </th>
                  <th
                    className="py-1.5"
                    scope="col"
                  >
                    Band
                  </th>
                </tr>
              </thead>
              <tbody>
                {finished.map(attempt => (
                  <tr
                    className="border-manga-black/20 border-b"
                    key={attempt.id}
                  >
                    <td className="py-1.5 pr-2 tabular-nums">
                      {dateFormat.format(new Date(attempt.startedAt))}
                    </td>
                    <td className="py-1.5 pr-2">
                      <Link
                        className="font-semibold underline"
                        href={`/ielts/attempts/${attempt.id}`}
                      >
                        {attempt.testTitle || attempt.testSlug || 'Drill'}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-2">
                      {IELTS_SKILL_LABELS[attempt.skill]}
                      {attempt.part ? ` P${attempt.part}` : ''} ·{' '}
                      {MODE_LABELS[attempt.mode]}
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {attempt.raw !== null
                        ? `${attempt.raw}/${attempt.total}`
                        : STATUS_LABELS[attempt.status]}
                    </td>
                    <td className="py-1.5 font-sans font-black tabular-nums">
                      {attempt.band === null ? '-' : attempt.band.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </ExamCard>
  )
}

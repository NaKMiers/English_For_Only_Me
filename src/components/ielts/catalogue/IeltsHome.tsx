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
      aria-label="Bài đang làm dở"
      className="grid gap-2"
    >
      {attempts.slice(0, 3).map(attempt => {
        const left = minutesLeft(attempt.deadlineAt)

        return (
          <div
            className="border-ex-line flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-3"
            key={attempt.id}
          >
            <PlayCircle
              aria-hidden="true"
              className="size-5 shrink-0"
            />
            <p className="min-w-0 flex-1">
              <strong className="font-sans font-bold">
                {attempt.testTitle || attempt.testSlug}
              </strong>{' '}
              · {IELTS_SKILL_LABELS[attempt.skill]}
              {attempt.part ? ` part ${attempt.part}` : ''} ·{' '}
              {MODE_LABELS[attempt.mode]}
              {left !== null ? ` · còn ${left} phút` : ''}
            </p>
            <ExamButton
              href={attemptHref(attempt)}
              tone="ink"
            >
              Làm tiếp
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
      eyebrow="Điểm yếu"
      title="Dạng câu hay sai"
    >
      {!weakness || weakness.weakest.length === 0 ? (
        <p>
          Chưa đủ dữ liệu (cần ít nhất 5 câu mỗi dạng). Làm thêm 1 đề để thấy
          điểm yếu.
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
                    <strong className="font-sans font-bold">
                      {IELTS_QUESTION_TYPE_LABELS[row.type]}
                    </strong>{' '}
                    · {IELTS_SKILL_LABELS[row.skill]} · {row.correct}/
                    {row.total} đúng
                  </span>
                  <DrillButton
                    skill={row.skill}
                    type={row.type}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    aria-label={`${percent}% đúng`}
                    className="flex-1"
                    value={percent}
                  />
                  <span className="w-12 text-right font-sans text-sm font-bold tabular-nums">
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
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-2">
          <ExamBadge tone="pale">IELTS</ExamBadge>
          <h1 className="text-ex-ink font-sans text-2xl leading-tight font-bold sm:text-3xl">
            IELTS Tests
          </h1>
          <p className="max-w-2xl">
            Listening, Reading và Writing: luyện từng phần hoặc thi thử có giờ,
            chấm band và xem bằng chứng trong bài.
          </p>
        </div>
        <div className="border-ex-line grid gap-1 rounded-lg border bg-white px-4 py-3">
          <span className="font-sans text-xs font-bold uppercase">
            Ước tính hiện tại
            {overall ? ` (${overall.skills.length} kỹ năng)` : ''}
          </span>
          <strong className="font-sans text-3xl leading-none font-bold tabular-nums">
            {overall ? overall.band.toFixed(1) : '-'}
          </strong>
        </div>
      </header>

      <ContinueStrip attempts={open} />

      {error ? (
        <ExamCard title="Không tải được danh sách đề">
          <p>{error}</p>
          <ExamButton
            href="/ielts"
            tone="ink"
          >
            Thử lại
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
                Quản lý đề
              </ExamButton>
            ) : null
          }
          eyebrow="Đề thi"
          title="Chọn đề"
        >
          {catalog.length ? (
            <TestRows
              attempts={attempts}
              catalog={catalog}
            />
          ) : (
            <div className="grid gap-3">
              <p>
                {isAdmin ? 'Chưa có đề nào.' : 'Đề mới sẽ xuất hiện ở đây.'}
              </p>
              {isAdmin ? (
                <ExamButton
                  href="/admin/ielts"
                  tone="ink"
                >
                  Tạo đề
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

      <p className="text-ex-muted text-sm">
        Band là ước tính theo bảng quy đổi thông dụng, không phải điểm chính
        thức.
      </p>
    </ExamSheet>
  )
}

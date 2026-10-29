'use client'

import { ChevronDown } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import {
  IELTS_QUESTION_TYPE_LABELS,
  IELTS_SKILL_LABELS,
  type IeltsQuestionType,
} from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import type { IeltsReviewRow } from '@/modules/ielts/services/resultPageData'

import { DrillButton } from '../catalogue/DrillButton'
import { highlightText } from '../runner/PassagePane'
import { ReviewMark } from '../widgets/ReviewMark'
import { LineDictation } from './LineDictation'
import { SaveWordButton } from './SaveWordButton'
import { ExamButton, ExamCard, StatTile } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  rows: IeltsReviewRow[]
  sections: IeltsPublicSection[]
}

type Filter = 'all' | 'wrong' | 'blank'

const FILTERS: [Filter, string][] = [
  ['all', 'Tất cả'],
  ['wrong', 'Sai'],
  ['blank', 'Bỏ trống'],
]

/** The block the evidence points at: a passage paragraph or a script line. */
function EvidenceContext({
  row,
  sections,
}: {
  row: IeltsReviewRow
  sections: IeltsPublicSection[]
}) {
  const section = sections.find(item => item.order === row.part)

  if (!row.evidence || !section) return null

  const text =
    section.reading?.paragraphs[row.evidence.blockIndex]?.text ??
    section.listening?.lines?.[row.evidence.blockIndex]?.text ??
    ''
  const speaker = section.listening?.lines?.[row.evidence.blockIndex]?.speaker
  const label = section.reading?.paragraphs[row.evidence.blockIndex]?.label

  if (!text) return null

  return (
    <blockquote className="border-ex-line font-body rounded-lg border-l-4 bg-white px-3 py-2 text-[16px] leading-[1.7]">
      {speaker ? <strong className="font-sans">{speaker}: </strong> : null}
      {label ? <strong className="font-sans">{label} </strong> : null}
      {highlightText(text, row.evidence.quote)}
    </blockquote>
  )
}

function weakestType(rows: IeltsReviewRow[]): IeltsQuestionType | null {
  const counts = new Map<IeltsQuestionType, { wrong: number; total: number }>()

  for (const row of rows) {
    const current = counts.get(row.type) ?? { wrong: 0, total: 0 }

    counts.set(row.type, {
      wrong: current.wrong + (row.outcome === 'correct' ? 0 : 1),
      total: current.total + 1,
    })
  }

  let worst: IeltsQuestionType | null = null
  let worstRate = 0

  for (const [type, { wrong, total }] of counts) {
    const rate = wrong / total

    if (wrong > 0 && rate > worstRate) {
      worst = type
      worstRate = rate
    }
  }

  return worst
}

/** Listening / Reading result: band row, next actions, filterable review. */
export function ObjectiveResult({ attempt, rows, sections }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [openRow, setOpenRow] = useState<number | null>(null)
  const result = attempt.result
  const wrong = rows.filter(row => row.outcome !== 'correct').length
  const weakest = useMemo(() => weakestType(rows), [rows])
  const visible = rows.filter(row =>
    filter === 'all'
      ? true
      : filter === 'wrong'
        ? row.outcome === 'wrong'
        : row.outcome === 'blank'
  )
  const partLabel = (part: number) =>
    attempt.skill === 'listening' ? `Part ${part}` : `Passage ${part}`

  return (
    <div className="grid gap-6">
      {attempt.status === 'scored' &&
      attempt.submittedAt &&
      attempt.deadlineAt &&
      new Date(attempt.submittedAt) > new Date(attempt.deadlineAt) ? (
        <p
          className="border-ex-line bg-ex-soft rounded-lg border px-3 py-2"
          role="status"
        >
          Hết giờ, đã chấm phần đã lưu.
        </p>
      ) : null}

      <section
        aria-label="Kết quả"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {result?.band !== null && result?.band !== undefined ? (
          <StatTile
            detail={`${result.raw}/${result.total} câu đúng`}
            label={`${IELTS_SKILL_LABELS[attempt.skill]} band`}
            tone="ink"
            value={result.band.toFixed(1)}
          />
        ) : (
          <StatTile
            detail={
              attempt.mode === 'drill'
                ? 'Drill không quy ra band'
                : 'Chỉ cả bài 40 câu mới có band'
            }
            label="Điểm"
            tone="ink"
            value={`${result?.raw ?? 0}/${result?.total ?? 0}`}
          />
        )}
        {(result?.perPart ?? []).map(part => (
          <StatTile
            key={part.part}
            label={partLabel(part.part)}
            value={`${part.raw}/${part.total}`}
          />
        ))}
      </section>

      <ExamCard
        eyebrow="Tiếp theo"
        title={`${wrong} câu sai hoặc bỏ trống`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {weakest && attempt.skill !== 'writing' ? (
            <>
              <span className="font-semibold">
                Yếu nhất: {IELTS_QUESTION_TYPE_LABELS[weakest]}
              </span>
              <DrillButton
                skill={attempt.skill as 'listening' | 'reading'}
                type={weakest}
              />
            </>
          ) : (
            <span className="font-semibold">Không có câu sai. Tốt lắm.</span>
          )}
          {attempt.testSlug ? (
            <ExamButton
              href={`/ielts/${attempt.testSlug}`}
              tone="paper"
            >
              Về đề
            </ExamButton>
          ) : null}
        </div>
      </ExamCard>

      <ExamCard
        eyebrow="Xem lại"
        title="Đáp án"
      >
        {/* Segmented filter (aria-pressed): the documented raw-button exception. */}
        <div
          aria-label="Lọc câu"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {FILTERS.map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              className={cn(
                'border-ex-line min-h-9 rounded-lg border px-3 font-sans text-sm font-bold',
                filter === value
                  ? 'bg-ex-accent text-white'
                  : 'hover:bg-ex-soft bg-white'
              )}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-ex-line border-b font-sans text-xs uppercase">
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  #
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  Dạng
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  Bạn trả lời
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  Đáp án
                </th>
                <th
                  className="py-2"
                  scope="col"
                >
                  Kết quả
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const expanded = openRow === row.number

                return (
                  <Fragment key={row.number}>
                    <tr className="border-ex-line border-b align-top">
                      <td className="py-2 pr-2">
                        {/* Disclosure trigger (aria-expanded): documented raw-button exception. */}
                        <button
                          aria-controls={`ielts-row-${row.number}`}
                          aria-expanded={expanded}
                          className="inline-flex min-h-8 items-center gap-1 font-sans font-bold"
                          onClick={() =>
                            setOpenRow(expanded ? null : row.number)
                          }
                          type="button"
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={cn(
                              'size-4 transition-transform',
                              expanded && 'rotate-180'
                            )}
                          />
                          {row.number}
                        </button>
                      </td>
                      <td className="py-2 pr-2 text-sm">
                        {IELTS_QUESTION_TYPE_LABELS[row.type]}
                      </td>
                      <td className="py-2 pr-2 font-semibold">
                        {row.given || '-'}
                        {row.overLimit ? (
                          <span className="text-ex-wrong block text-xs">
                            Quá số từ cho phép
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2">{row.accepted.join(' / ')}</td>
                      <td className="py-2">
                        <ReviewMark
                          mark={{ outcome: row.outcome, accepted: [] }}
                          showAccepted={false}
                        />
                      </td>
                    </tr>
                    {expanded ? (
                      <tr id={`ielts-row-${row.number}`}>
                        <td
                          className="pb-4"
                          colSpan={5}
                        >
                          <div className="grid gap-3 pt-1">
                            {row.explanation ? (
                              <p className="leading-[1.7]">{row.explanation}</p>
                            ) : null}
                            {row.evidence ? (
                              <EvidenceContext
                                row={row}
                                sections={sections}
                              />
                            ) : (
                              <p className="text-ex-muted text-sm">
                                Không có trong bài (NOT GIVEN).
                              </p>
                            )}
                            {row.outcome !== 'correct' &&
                            row.accepted[0] &&
                            /^[a-z][a-z' -]{1,40}$/i.test(row.accepted[0]) &&
                            row.accepted[0].split(' ').length <= 3 ? (
                              <SaveWordButton
                                context={row.evidence?.quote ?? ''}
                                term={row.accepted[0]}
                              />
                            ) : null}
                            {attempt.skill === 'listening' && row.evidence ? (
                              <LineDictation
                                line={
                                  sections.find(item => item.order === row.part)
                                    ?.listening?.lines?.[
                                    row.evidence.blockIndex
                                  ]?.text ?? ''
                                }
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </ExamCard>
    </div>
  )
}

'use client'

import { ChevronDown } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsQuestionType } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import type { IeltsReviewRow } from '@/modules/ielts/services/resultPageData'

import { DrillButton } from '../catalogue/DrillButton'
import { highlightText } from '../runner/PassagePane'
import { ReviewMark } from '../widgets/ReviewMark'
import { LineDictation } from './LineDictation'
import { SaveWordButton } from './SaveWordButton'
import { ExamCard } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  rows: IeltsReviewRow[]
  sections: IeltsPublicSection[]
}

type Filter = 'all' | 'wrong' | 'blank'

const FILTERS: Filter[] = ['all', 'wrong', 'blank']

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
    <blockquote className="border-line font-body rounded-control bg-surface border-l-4 px-3 py-2 text-[16px] leading-[1.7]">
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
  const t = useMessages().ielts
  // Wrong answers first: the list is for fixing, not for re-reading.
  const [filter, setFilter] = useState<Filter>('wrong')
  const [openRow, setOpenRow] = useState<number | null>(null)
  const wrong = rows.filter(row => row.outcome !== 'correct').length
  const weakest = useMemo(() => weakestType(rows), [rows])
  const visible = rows.filter(row =>
    filter === 'all'
      ? true
      : filter === 'wrong'
        ? row.outcome === 'wrong'
        : row.outcome === 'blank'
  )

  return (
    <div className="grid gap-6">
      {attempt.status === 'scored' &&
      attempt.submittedAt &&
      attempt.deadlineAt &&
      new Date(attempt.submittedAt) > new Date(attempt.deadlineAt) ? (
        <p
          className="border-line bg-tint-soft rounded-control border px-3 py-2"
          role="status"
        >
          {t.result.timeRanOut}
        </p>
      ) : null}

      <ExamCard
        eyebrow={t.result.next}
        title={format(t.result.wrongOrBlank, { count: wrong })}
      >
        <div className="flex flex-wrap items-center gap-3">
          {weakest && attempt.skill !== 'writing' ? (
            <>
              <span className="font-semibold">
                {format(t.result.weakest, { type: t.questionTypes[weakest] })}
              </span>
              <DrillButton
                skill={attempt.skill as 'listening' | 'reading'}
                type={weakest}
              />
            </>
          ) : (
            <span className="font-semibold">{t.result.noWrong}</span>
          )}
        </div>
      </ExamCard>

      <ExamCard
        eyebrow={t.result.review}
        title={t.result.answers}
      >
        {/* Segmented filter (aria-pressed): the documented raw-button exception. */}
        <div
          aria-label={t.result.filterLabel}
          className="flex flex-wrap gap-2"
          role="group"
        >
          {FILTERS.map(value => (
            <button
              aria-pressed={filter === value}
              className={cn(
                'border-line rounded-control soft-press min-h-11 border px-3 font-sans text-sm font-medium sm:min-h-9',
                filter === value
                  ? 'bg-cta text-cta-fg'
                  : 'hover:bg-tint-soft bg-surface hover-pop'
              )}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {t.result.filters[value]}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-line border-b font-sans text-xs">
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
                  {t.result.type}
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  {t.result.yourAnswer}
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  {t.result.answer}
                </th>
                <th
                  className="py-2"
                  scope="col"
                >
                  {t.result.outcome}
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const expanded = openRow === row.number

                return (
                  <Fragment key={row.number}>
                    <tr className="border-line/20 border-b align-top">
                      <td className="py-2 pr-2">
                        {/* Disclosure trigger (aria-expanded): documented raw-button exception. */}
                        <button
                          aria-controls={`ielts-row-${row.number}`}
                          aria-expanded={expanded}
                          className="soft-press hover-pop rounded-tag inline-flex min-h-11 items-center gap-1 font-sans font-medium"
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
                        {t.questionTypes[row.type]}
                      </td>
                      <td className="py-2 pr-2 font-semibold">
                        {row.given || '-'}
                        {row.overLimit ? (
                          <span className="text-danger block text-xs">
                            {t.result.overLimit}
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
                              <p className="text-ink-soft text-sm">
                                {t.result.notGiven}
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

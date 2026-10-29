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
  ['all', 'All'],
  ['wrong', 'Wrong'],
  ['blank', 'Blank'],
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
    <blockquote className="border-manga-black font-body rounded-control bg-manga-white border-l-4 px-3 py-2 text-[16px] leading-[1.7]">
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
          className="border-manga-black bg-manga-pale-red rounded-control border-2 px-3 py-2"
          role="status"
        >
          Time ran out. Saved answers were graded.
        </p>
      ) : null}

      <section
        aria-label="Result"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        {result?.band !== null && result?.band !== undefined ? (
          <StatTile
            detail={`${result.raw}/${result.total} correct`}
            label={`${IELTS_SKILL_LABELS[attempt.skill]} band`}
            tone="ink"
            value={result.band.toFixed(1)}
          />
        ) : (
          <StatTile
            detail={
              attempt.mode === 'drill'
                ? 'A drill does not give a band'
                : 'Only a full 40-question test gives a band'
            }
            label="Score"
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
        eyebrow="Next"
        title={`${wrong} wrong or blank`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {weakest && attempt.skill !== 'writing' ? (
            <>
              <span className="font-semibold">
                Weakest: {IELTS_QUESTION_TYPE_LABELS[weakest]}
              </span>
              <DrillButton
                skill={attempt.skill as 'listening' | 'reading'}
                type={weakest}
              />
            </>
          ) : (
            <span className="font-semibold">No wrong answers. Well done.</span>
          )}
          {attempt.testSlug ? (
            <ExamButton
              href={`/ielts/${attempt.testSlug}`}
              tone="paper"
            >
              Back to test
            </ExamButton>
          ) : null}
        </div>
      </ExamCard>

      <ExamCard
        eyebrow="Review"
        title="Answers"
      >
        {/* Segmented filter (aria-pressed): the documented raw-button exception. */}
        <div
          aria-label="Filter questions"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {FILTERS.map(([value, label]) => (
            <button
              aria-pressed={filter === value}
              className={cn(
                'border-manga-black rounded-control min-h-9 border-2 px-3 font-sans text-sm font-black',
                filter === value
                  ? 'bg-manga-red text-manga-white'
                  : 'hover:bg-manga-pale-red bg-manga-white'
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
              <tr className="border-manga-black border-b-2 font-sans text-xs uppercase">
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
                  Type
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  Your answer
                </th>
                <th
                  className="py-2 pr-2"
                  scope="col"
                >
                  Answer
                </th>
                <th
                  className="py-2"
                  scope="col"
                >
                  Result
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map(row => {
                const expanded = openRow === row.number

                return (
                  <Fragment key={row.number}>
                    <tr className="border-manga-black/20 border-b align-top">
                      <td className="py-2 pr-2">
                        {/* Disclosure trigger (aria-expanded): documented raw-button exception. */}
                        <button
                          aria-controls={`ielts-row-${row.number}`}
                          aria-expanded={expanded}
                          className="inline-flex min-h-8 items-center gap-1 font-sans font-black"
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
                          <span className="text-manga-red block text-xs">
                            Over the word limit
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
                              <p className="text-muted-foreground text-sm">
                                Not in the text (NOT GIVEN).
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

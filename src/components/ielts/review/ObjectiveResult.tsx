'use client'

import { ArrowRight, ChevronDown } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { IeltsAttemptRecord } from '@/modules/ielts/attempts/attemptRecords'
import type { IeltsQuestionType } from '@/modules/ielts/constants'
import type { IeltsPublicSection } from '@/modules/ielts/publicView'
import type { IeltsReviewRow } from '@/modules/ielts/services/resultPageData'
import { reviewWordOf } from '@/modules/ielts/services/reviewWord'

import { DrillButton } from '../catalogue/DrillButton'
import { highlightText } from '../runner/PassagePane'
import { ReviewMark } from '../widgets/ReviewMark'
import { LineDictation } from './LineDictation'
import { SaveWordButton } from './SaveWordButton'
import { ExamCard } from '@/components/ielts/ui'

interface Props {
  attempt: IeltsAttemptRecord
  rows: IeltsReviewRow[]
  /** Review words the learner already saved: their buttons start saved. */
  savedTerms?: string[]
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
export function ObjectiveResult({
  attempt,
  rows,
  savedTerms = [],
  sections,
}: Props) {
  const t = useMessages().ielts
  // Wrong answers first: the list is for fixing, not for re-reading. With
  // none wrong (all right, or only blanks after time ran out) start on all,
  // so the table never opens empty.
  const [filter, setFilter] = useState<Filter>(() =>
    rows.some(row => row.outcome === 'wrong') ? 'wrong' : 'all'
  )
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
        // What to drill sits in the card's header: no separate "Next" card.
        action={
          weakest && attempt.skill !== 'writing' ? (
            <span className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-sm font-medium">
                {format(t.result.weakest, { type: t.questionTypes[weakest] })}
              </span>
              <DrillButton
                skill={attempt.skill as 'listening' | 'reading'}
                type={weakest}
              />
            </span>
          ) : (
            <span className="text-ink-soft text-sm">{t.result.noWrong}</span>
          )
        }
        eyebrow={format(t.result.wrongOrBlank, { count: wrong })}
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
        {/* Compact rows (no sideways scroll on phones): number, given ->
            accepted, the mark; the question type as a quiet line. */}
        <ul
          className="divide-line grid divide-y"
          data-review-list=""
        >
          {visible.map(row => {
            // "Wrong" is for fixing: every explanation is open. Elsewhere a
            // row folds, and the whole row is its trigger.
            const inline = filter === 'wrong'
            const expanded = inline || openRow === row.number
            const head = (
              <>
                <span className="w-7 shrink-0 font-sans font-medium tabular-nums">
                  {row.number}
                </span>
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2 wrap-break-word">
                    <span
                      className={cn(
                        row.outcome !== 'correct' && 'text-ink-soft',
                        row.outcome === 'wrong' && 'line-through'
                      )}
                    >
                      <span className="sr-only">{t.result.yourAnswer}: </span>
                      {row.given || '-'}
                    </span>
                    {row.outcome !== 'correct' ? (
                      <>
                        <ArrowRight
                          aria-hidden="true"
                          className="text-ink-soft size-3.5 shrink-0 self-center"
                        />
                        <span className="text-lesson-correct font-medium">
                          <span className="sr-only">{t.result.answer}: </span>
                          {row.accepted.join(' / ')}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="text-ink-soft text-xs">
                    {t.questionTypes[row.type]}
                    {row.overLimit ? (
                      <span className="text-danger">
                        {' · '}
                        {t.result.overLimit}
                      </span>
                    ) : null}
                  </span>
                </span>
                <ReviewMark
                  className="shrink-0"
                  mark={{ outcome: row.outcome, accepted: [] }}
                  showAccepted={false}
                  wordSrOnly
                />
                {inline ? null : (
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'text-ink-soft mt-1 size-4 shrink-0 transition-transform',
                      expanded && 'rotate-180'
                    )}
                  />
                )}
              </>
            )

            return (
              <li
                data-review-row={row.number}
                key={row.number}
              >
                {inline ? (
                  <div className="flex items-start gap-3 px-1 py-2">{head}</div>
                ) : (
                  // Disclosure trigger (aria-expanded): documented raw-button exception.
                  <button
                    aria-controls={`ielts-row-${row.number}`}
                    aria-expanded={expanded}
                    className="soft-press hover:bg-tint-soft rounded-control flex min-h-11 w-full items-start gap-3 px-1 py-2 text-left"
                    onClick={() => setOpenRow(expanded ? null : row.number)}
                    type="button"
                  >
                    {head}
                  </button>
                )}
                {expanded ? (
                  <div
                    className="grid gap-2 pb-3 pl-10"
                    id={`ielts-row-${row.number}`}
                  >
                    {/* The evidence is the main line; the explanation is a
                        quiet note under it. */}
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
                    {row.explanation ? (
                      <p className="text-ink-soft text-sm leading-6">
                        {row.explanation}
                      </p>
                    ) : null}
                    {(() => {
                      const saveWord = reviewWordOf(row)
                      const line =
                        attempt.skill === 'listening' && row.evidence
                          ? (sections.find(item => item.order === row.part)
                              ?.listening?.lines?.[row.evidence.blockIndex]
                              ?.text ?? '')
                          : ''

                      return saveWord || line ? (
                        // One row of tools, not one row each.
                        <div className="flex flex-wrap items-center gap-2">
                          {line ? <LineDictation line={line} /> : null}
                          {saveWord ? (
                            <SaveWordButton
                              context={row.evidence?.quote ?? ''}
                              initiallySaved={savedTerms.includes(saveWord)}
                              term={saveWord}
                            />
                          ) : null}
                        </div>
                      ) : null
                    })()}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </ExamCard>
    </div>
  )
}

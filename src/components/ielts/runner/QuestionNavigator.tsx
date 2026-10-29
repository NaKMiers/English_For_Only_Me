'use client'

import { ArrowLeft, ArrowRight, ChevronUp, ListChecks } from 'lucide-react'
import Link from 'next/link'
import { memo, useState } from 'react'

import { cn } from '@/lib/utils'
import type { IeltsAnswers } from '@/modules/ielts/scoring/scoreObjective'

import { type IeltsQuestionEntry, isAnswered } from './questionIndex'

interface Props {
  answers: IeltsAnswers
  currentNumber: number | null
  currentPart: number
  index: IeltsQuestionEntry[]
  /** The test's next skill; its link closes the bar on the right. */
  next?: { href: string; label: string } | null
  onPartChange: (part: number) => void
  onSelect: (entry: IeltsQuestionEntry) => void
  partLabel: (part: number) => string
  /** The test's previous skill; its link opens the bar on the left. */
  prev?: { href: string; label: string } | null
}

const SKILL_LINK_CLASS =
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control inline-flex h-9 shrink-0 items-center gap-1 border-2 px-2.5 font-sans text-sm font-black transition-colors sm:gap-1.5 sm:px-3'

/** Previous / next skill link. `compact` hides the label on phones. */
function SkillLink({
  compact,
  direction,
  link,
}: {
  compact: boolean
  direction: 'prev' | 'next'
  link: { href: string; label: string }
}) {
  const Icon = direction === 'prev' ? ArrowLeft : ArrowRight
  const icon = (
    <Icon
      aria-hidden="true"
      className="size-4"
    />
  )

  return (
    <Link
      className={SKILL_LINK_CLASS}
      href={link.href}
      title={`Go to ${link.label}. Your answers here stay saved.`}
    >
      {direction === 'prev' ? icon : null}
      <span className={cn(compact && 'max-sm:sr-only')}>{link.label}</span>
      {direction === 'next' ? icon : null}
    </Link>
  )
}

/**
 * A small centred bottom bar: the previous skill, a Questions button with the
 * answered count that folds out the current part's question numbers, a joined
 * 1 2 3 4 part switcher, then the next skill. Answered numbers are soft red,
 * the current one solid red; a part with every question answered gets a dot.
 */
export const QuestionNavigator = memo(function QuestionNavigator({
  answers,
  currentNumber,
  currentPart,
  index,
  next = null,
  onPartChange,
  onSelect,
  partLabel,
  prev = null,
}: Props) {
  const [open, setOpen] = useState(false)
  // With both skill links the row is too wide for a phone: arrows only there.
  const compact = Boolean(prev && next)
  const parts = [...new Set(index.map(entry => entry.part))]
  const answeredTotal = index.filter(entry => isAnswered(entry, answers)).length
  const partEntries = index.filter(entry => entry.part === currentPart)

  return (
    <nav
      aria-label="Question list"
      className="border-manga-black bg-manga-white shrink-0 border-t-3 px-3 py-2"
    >
      {open ? (
        <div
          className="mx-auto mb-2 flex max-w-3xl flex-wrap justify-center gap-1.5"
          id="question-numbers"
        >
          {partEntries.map(entry => {
            const answered = isAnswered(entry, answers)
            const current = entry.number === currentNumber

            return (
              // Navigator chip (aria-current): a plain button by design.
              <button
                aria-current={current ? 'true' : undefined}
                aria-label={`Question ${entry.number}, ${current ? 'current' : answered ? 'answered' : 'not answered'}`}
                className={cn(
                  'rounded-tag grid size-9 place-items-center border-2 font-sans text-[13px] font-black tabular-nums transition-colors',
                  current
                    ? 'border-manga-red bg-manga-red text-manga-white'
                    : answered
                      ? 'border-manga-red/30 bg-manga-paper-soft text-manga-red'
                      : 'border-manga-black bg-manga-white text-manga-black hover:bg-manga-pale-red'
                )}
                key={entry.number}
                onClick={() => onSelect(entry)}
                type="button"
              >
                {entry.number}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
        {prev ? (
          <SkillLink
            compact={compact}
            direction="prev"
            link={prev}
          />
        ) : null}
        {/* Disclosure toggle (aria-expanded): a plain button by design. */}
        <button
          aria-controls="question-numbers"
          aria-expanded={open}
          className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control inline-flex h-9 items-center gap-2 border-2 px-2.5 font-sans text-sm font-black transition-colors sm:px-3"
          onClick={() => setOpen(value => !value)}
          type="button"
        >
          {/* Icon-only label on phones, so the next-skill link still fits. */}
          <ListChecks
            aria-hidden="true"
            className="size-4 sm:hidden"
          />
          <span className="max-sm:sr-only">Questions</span>
          <span className="text-manga-ink-soft text-xs tabular-nums">
            {answeredTotal}/{index.length}
          </span>
          <ChevronUp
            aria-hidden="true"
            className={cn(
              'size-4 transition-transform max-sm:hidden',
              !open && 'rotate-180'
            )}
          />
        </button>

        {parts.length > 1 ? (
          // Segmented part switcher (aria-pressed): documented raw exception.
          <div
            aria-label="Choose part"
            className="border-manga-black rounded-control flex overflow-hidden border-2"
            role="group"
          >
            {parts.map(part => {
              const entries = index.filter(entry => entry.part === part)
              const done = entries.filter(entry =>
                isAnswered(entry, answers)
              ).length
              const active = part === currentPart

              return (
                <button
                  aria-label={`${partLabel(part)}, ${done} of ${entries.length} answered`}
                  aria-pressed={active}
                  className={cn(
                    'border-manga-black relative grid h-8 min-w-8 place-items-center border-l-2 px-1.5 font-sans text-sm font-black tabular-nums transition-colors first:border-l-0',
                    active
                      ? 'bg-manga-black text-manga-white'
                      : 'bg-manga-white hover:bg-manga-paper-soft'
                  )}
                  key={part}
                  onClick={() => onPartChange(part)}
                  title={`${partLabel(part)}: ${done}/${entries.length} answered`}
                  type="button"
                >
                  {part}
                  {done === entries.length && entries.length > 0 ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-1 right-1 size-1.5 rounded-full',
                        active ? 'bg-manga-white' : 'bg-manga-red'
                      )}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : null}

        {next ? (
          <SkillLink
            compact={compact}
            direction="next"
            link={next}
          />
        ) : null}
      </div>
    </nav>
  )
})

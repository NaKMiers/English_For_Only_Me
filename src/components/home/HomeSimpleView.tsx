import {
  ArrowRight,
  BookA,
  CircleCheck,
  Clock3,
  GraduationCap,
  PenLine,
  Target,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { NextStopCard } from '@/components/journey/NextStopCard'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { DUE_ICON } from '@/constants/stateIcons'
import { MODULE_THEMES } from '@/constants/theme'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { pickNextStop } from '@/lib/journey/nextStop'
import { cn } from '@/lib/utils'
import { VOCAB_RECALL_HREF } from '@/modules/vocabulary/constants'

type SimpleModule = 'dictation' | 'vocabulary' | 'grammar' | 'ielts'

interface NextRow {
  /** Reviews waiting, or null for a row with nothing to count. */
  due: number | null
  hint: string
  href: string
  icon: LucideIcon
  label: string
  module: SimpleModule
}

interface Props {
  accuracyPercent: number | null
  /** The study buddy card, shared with the full view. */
  buddy: ReactNode
  dictationDue: number
  grammarDue: number
  /** The most overdue grammar review, where "N due" leads. */
  grammarDueHref?: string | null
  grammarDueTitle?: string | null
  messages: Messages
  /** The grammar path's next step (lesson, review, checkpoint), if any. */
  nextGrammarHref?: string | null
  nextGrammarTitle: string | null
  vocabularyDue: number
  weeklyMinutes: number
  wordsKnown: number
}

function UpNextRow({ row, messages }: { row: NextRow; messages: Messages }) {
  const theme = MODULE_THEMES[row.module]
  const Icon = row.icon
  const waiting = row.due !== null && row.due > 0

  return (
    <li>
      <Link
        href={row.href}
        className="soft-press hover-pop hover:bg-tint-soft group rounded-control flex min-h-20 items-center gap-3 px-3 py-3 sm:gap-4"
      >
        <span
          className={cn(
            'rounded-control grid size-11 shrink-0 place-items-center sm:size-14',
            theme.tint,
            theme.accent
          )}
        >
          <Icon
            aria-hidden="true"
            className="size-6"
            strokeWidth={1.7}
          />
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          {/* The label wraps rather than truncates: on a phone the due
              pill leaves little room, and "Dictation…" says nothing. */}
          <span className="font-sans text-base leading-tight font-medium wrap-break-word">
            {row.label}
          </span>
          <span className="text-ink-soft truncate text-sm">{row.hint}</span>
        </span>
        {row.due === null ? null : waiting ? (
          <span className="bg-brand-soft text-brand-ink shrink-0 rounded-full px-3 py-1 text-sm font-medium tabular-nums">
            {format(messages.home.simple.due, { count: row.due })}
          </span>
        ) : (
          // Cleared today: a tick, the small win of the row.
          <span className="text-lesson-correct flex shrink-0 items-center gap-1 text-sm">
            <CircleCheck
              aria-hidden="true"
              className="size-5"
            />
            <span className="sr-only">{messages.common.journey.allClear}</span>
          </span>
        )}
        <ArrowRight
          aria-hidden="true"
          className="text-ink-soft size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}

/**
 * The calm dashboard. Same three-column frame as the full view, but each
 * block says one thing in large type: what is waiting in each module (a
 * tick once a module is cleared), the one next stop, three headline
 * numbers as big stat chips, and the study buddy.
 */
export function HomeSimpleView({
  accuracyPercent,
  buddy,
  dictationDue,
  grammarDue,
  messages,
  grammarDueHref = null,
  grammarDueTitle = null,
  nextGrammarHref = null,
  nextGrammarTitle,
  vocabularyDue,
  weeklyMinutes,
  wordsKnown,
}: Props) {
  const t = messages.home.simple
  const totalDue = dictationDue + vocabularyDue + grammarDue
  const rows: NextRow[] = [
    {
      due: dictationDue,
      hint: messages.common.modules.dictation.title,
      href: '/dictation/review',
      icon: DUE_ICON,
      label: t.dictationReview,
      module: 'dictation',
    },
    {
      due: vocabularyDue,
      hint: messages.common.modules.vocabulary.title,
      // Cards due: straight into the recall session, not the landing.
      href: vocabularyDue > 0 ? VOCAB_RECALL_HREF : '/vocabulary',
      icon: BookA,
      label: t.vocabularyRecall,
      module: 'vocabulary',
    },
    {
      due: grammarDue,
      // With reviews due, the row counts them, so it opens the most overdue
      // one; otherwise the next lesson (or checkpoint) itself, not the path.
      hint:
        grammarDue > 0
          ? (grammarDueTitle ?? nextGrammarTitle ?? t.grammarStart)
          : (nextGrammarTitle ?? t.grammarStart),
      href:
        grammarDue > 0
          ? (grammarDueHref ?? '/grammar')
          : (nextGrammarHref ?? '/grammar'),
      icon: PenLine,
      label: t.grammar,
      module: 'grammar',
    },
    {
      due: null,
      hint: t.ieltsHint,
      href: '/ielts',
      icon: GraduationCap,
      label: t.ielts,
      module: 'ielts',
    },
  ]
  // The one task to start with (one rule for every module): the module
  // with the most reviews waiting, else the next grammar lesson.
  const busiest = rows
    .filter(row => (row.due ?? 0) > 0)
    .sort((left, right) => (right.due ?? 0) - (left.due ?? 0))[0]
  const picked = pickNextStop([
    busiest
      ? {
          data: {
            detail: format(t.focusDue, { count: busiest.due ?? 0 }),
            row: busiest,
          },
          kind: 'due' as const,
        }
      : null,
    {
      data: {
        detail: t.focusLesson,
        row: {
          ...rows[2],
          // The next lesson, whatever is due.
          href: nextGrammarHref ?? '/grammar',
          label: nextGrammarTitle ?? t.grammarStart,
        },
      },
      kind: 'next' as const,
    },
  ])
  const focus = picked.kind === 'done' ? null : picked.data
  // The next stop card already offers its row: the list shows the rest.
  const upNext = focus
    ? rows.filter(row => row.module !== focus.row.module)
    : rows
  const numbers = [
    {
      icon: Clock3,
      label: t.thisWeek,
      tone: 'dictation' as const,
      value: String(weeklyMinutes),
    },
    {
      icon: BookA,
      label: t.wordsKnown,
      tone: 'vocabulary' as const,
      value: String(wordsKnown),
    },
    {
      icon: Target,
      label: t.accuracy,
      tone: 'ielts' as const,
      value: accuracyPercent === null ? '-' : `${accuracyPercent}%`,
    },
  ]

  return (
    <div className="motion-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
      {/* Column 1: what is waiting, module by module. */}
      <section
        aria-labelledby="home-next-title"
        className="border-line bg-surface rounded-panel grid min-w-0 content-start gap-2 border p-3 sm:p-4 md:col-span-2 xl:col-span-1"
      >
        <div className="flex items-center justify-between gap-3 px-2 pt-1 pb-2">
          <h2
            id="home-next-title"
            className="font-sans text-2xl font-medium tracking-tight"
          >
            {t.upNext}
          </h2>
          <span
            className={cn(
              'rounded-full px-3 py-1 text-sm font-medium tabular-nums',
              totalDue > 0
                ? 'bg-brand-soft text-brand-ink'
                : 'bg-tint text-ink-soft'
            )}
          >
            {totalDue > 0 ? format(t.due, { count: totalDue }) : t.allClear}
          </span>
        </div>
        <ul className="grid gap-1">
          {upNext.map(row => (
            <UpNextRow
              key={row.href}
              row={row}
              messages={messages}
            />
          ))}
        </ul>
      </section>

      {/* Column 2: the one task to start with, then three numbers. */}
      <div className="grid min-w-0 content-start gap-5">
        {focus ? (
          <NextStopCard
            actionLabel={t.start}
            className="border-line border"
            detail={focus.detail}
            href={focus.row.href}
            pinLabel={messages.common.journey.nextStop}
            title={focus.row.label}
          />
        ) : null}

        <section
          aria-labelledby="home-numbers-title"
          className="border-line bg-surface rounded-panel grid min-w-0 gap-3 border p-3 sm:p-4"
        >
          <h2
            id="home-numbers-title"
            className="px-2 font-sans text-lg font-medium"
          >
            {t.numbersTitle}
          </h2>
          <StatStrip className="grid">
            {numbers.map(item => (
              // Labels stay on phones: three bare numbers ("0 / 3196 /
              // 0%") do not say what they count.
              <StatChip
                className="bg-tint-soft justify-between"
                icon={item.icon}
                key={item.label}
                label={item.label}
                labelAlways
                size="lg"
                tone={item.tone}
                value={item.value}
              />
            ))}
          </StatStrip>
        </section>
      </div>

      {/* Column 3: the study buddy, same as the full view. */}
      {buddy}
    </div>
  )
}

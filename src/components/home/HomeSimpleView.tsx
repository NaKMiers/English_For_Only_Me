import {
  ArrowRight,
  BookA,
  Clock3,
  GraduationCap,
  PenLine,
  RotateCcw,
  Target,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { ActionButton } from '@/components/ui/ActionButton'
import { MODULE_THEMES } from '@/constants/theme'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'

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
  messages: Messages
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
        className="soft-press hover:bg-tint-soft group flex min-h-20 items-center gap-4 rounded-[20px] px-3 py-3 transition-colors"
      >
        <span
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-2xl',
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
          <span className="truncate font-sans text-base font-medium">
            {row.label}
          </span>
          <span className="text-ink-soft truncate text-sm">{row.hint}</span>
        </span>
        {row.due !== null ? (
          <span
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-sm font-medium tabular-nums',
              waiting ? 'bg-brand-soft text-brand-ink' : 'text-ink-soft'
            )}
          >
            {format(messages.home.simple.due, { count: row.due })}
          </span>
        ) : null}
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
 * block says one thing in large type: what is waiting in each module, the
 * one task to start with, three headline numbers, and the study buddy.
 */
export function HomeSimpleView({
  accuracyPercent,
  buddy,
  dictationDue,
  grammarDue,
  messages,
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
      icon: RotateCcw,
      label: t.dictationReview,
      module: 'dictation',
    },
    {
      due: vocabularyDue,
      hint: messages.common.modules.vocabulary.title,
      href: '/vocabulary',
      icon: BookA,
      label: t.vocabularyRecall,
      module: 'vocabulary',
    },
    {
      due: grammarDue,
      hint: nextGrammarTitle ?? t.grammarStart,
      href: '/grammar',
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
  // The one task to start with: the module with the most reviews waiting,
  // or the next grammar lesson when nothing is due.
  const busiest = rows
    .filter(row => (row.due ?? 0) > 0)
    .sort((left, right) => (right.due ?? 0) - (left.due ?? 0))[0]
  const focus = busiest
    ? {
        detail: format(t.focusDue, { count: busiest.due ?? 0 }),
        row: busiest,
      }
    : {
        detail: t.focusLesson,
        row: { ...rows[2], label: nextGrammarTitle ?? t.grammarStart },
      }
  const FocusIcon = focus.row.icon
  const focusTheme = MODULE_THEMES[focus.row.module]
  const numbers = [
    {
      icon: Clock3,
      label: t.thisWeek,
      tone: 'bg-pastel-sky text-accent-blue',
      value: String(weeklyMinutes),
    },
    {
      icon: BookA,
      label: t.wordsKnown,
      tone: 'bg-pastel-mint text-accent-green',
      value: String(wordsKnown),
    },
    {
      icon: Target,
      label: t.accuracy,
      tone: 'bg-pastel-peach text-accent-orange',
      value: accuracyPercent === null ? '-' : `${accuracyPercent}%`,
    },
  ]

  return (
    <div className="motion-stagger grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
      {/* Column 1: what is waiting, module by module. */}
      <section
        aria-labelledby="home-next-title"
        className="border-line bg-surface grid min-w-0 content-start gap-2 rounded-[26px] border p-3 sm:p-4 md:col-span-2 xl:col-span-1"
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
          {rows.map(row => (
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
        <section
          aria-labelledby="home-focus-title"
          className={cn(
            'grid min-w-0 gap-5 rounded-[26px] p-5',
            focusTheme.tint
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="bg-surface/80 rounded-full px-3 py-1 text-xs font-medium">
              {t.focus}
            </span>
            {/* The icon is a second way in: it lifts, fills and turns on
                hover so it reads as a button, not a picture. */}
            <Link
              href={focus.row.href}
              aria-label={`${t.start}: ${focus.row.label}`}
              className={cn(
                'soft-press hover-lift group/focus bg-surface/80 hover:bg-surface grid size-16 place-items-center rounded-full ring-0 ring-current/0 transition-[box-shadow,background-color] hover:ring-4 hover:ring-current/25',
                focusTheme.accent
              )}
            >
              <FocusIcon
                aria-hidden="true"
                className="size-8 transition-transform duration-300 ease-out group-hover/focus:scale-110 group-hover/focus:-rotate-45"
                strokeWidth={1.6}
              />
            </Link>
          </div>
          <div className="grid gap-1">
            <h2
              id="home-focus-title"
              className="font-sans text-3xl leading-tight font-medium tracking-tight wrap-break-word"
            >
              {focus.row.label}
            </h2>
            <p className="text-ink-soft text-sm">{focus.detail}</p>
          </div>
          <ActionButton
            href={focus.row.href}
            tone="ink"
            className="justify-self-start"
            icon={
              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            }
          >
            {t.start}
          </ActionButton>
        </section>

        <section
          aria-labelledby="home-numbers-title"
          className="border-line bg-surface grid min-w-0 gap-1 rounded-[26px] border p-3 sm:p-4"
        >
          <h2
            id="home-numbers-title"
            className="px-2 pb-1 font-sans text-lg font-medium"
          >
            {t.numbersTitle}
          </h2>
          <dl className="grid">
            {numbers.map(item => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-4 rounded-2xl px-2 py-2.5"
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-full',
                      item.tone
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-5"
                    />
                  </span>
                  <dt className="text-ink-soft min-w-0 flex-1 truncate text-sm">
                    {item.label}
                  </dt>
                  <dd className="font-sans text-3xl font-light tabular-nums">
                    {item.value}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      </div>

      {/* Column 3: the study buddy, same as the full view. */}
      {buddy}
    </div>
  )
}

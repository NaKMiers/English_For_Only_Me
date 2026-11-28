'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'

export interface SkillLinkTarget {
  href: string
  label: string
}

interface Props {
  /** Pinned to the right end of the bar from 1024px (Check part / task). */
  action?: ReactNode
  /** Bar content between the skill links. */
  children: ReactNode
  /** The test's next skill; its link closes the bar on the right. */
  next?: SkillLinkTarget | null
  /** The test's previous skill; its link opens the bar on the left. */
  prev?: SkillLinkTarget | null
  /** Folds out above the bar row (the question numbers). */
  top?: ReactNode
}

const SKILL_LINK_CLASS =
  'border-line bg-surface hover:bg-tint rounded-control soft-press hover-pop inline-flex h-11 shrink-0 items-center gap-1 border px-2.5 font-sans text-sm font-semibold sm:h-9 sm:gap-1.5 sm:px-3'

/** Previous / next skill link. `compact` hides the label on phones. */
function SkillLink({
  compact,
  direction,
  link,
}: {
  compact: boolean
  direction: 'prev' | 'next'
  link: SkillLinkTarget
}) {
  const t = useMessages().ielts.navigator
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
      title={format(t.goTo, { skill: link.label })}
    >
      {direction === 'prev' ? icon : null}
      <span className={cn(compact && 'max-sm:sr-only')}>{link.label}</span>
      {direction === 'next' ? icon : null}
    </Link>
  )
}

/**
 * The runner's small centred bottom bar, shared by every skill: the previous
 * skill, the skill's own controls, then the next skill. From 1024px an
 * optional action sits at the right end; below that the runner shows it
 * under the questions instead.
 */
export function RunnerFooter({
  action = null,
  children,
  next = null,
  prev = null,
  top,
}: Props) {
  const t = useMessages().ielts.navigator
  // With both skill links the row is too wide for a phone: arrows only there.
  const compact = Boolean(prev && next)

  return (
    <nav
      aria-label={t.label}
      className="border-line bg-exam-surface shrink-0 border-t px-3 py-2"
    >
      {top}
      <div
        className={cn(
          'grid items-center gap-2',
          action && 'lg:grid-cols-[1fr_auto_1fr]'
        )}
      >
        {action ? <span className="max-lg:hidden" /> : null}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          {prev ? (
            <SkillLink
              compact={compact}
              direction="prev"
              link={prev}
            />
          ) : null}
          {children}
          {next ? (
            <SkillLink
              compact={compact}
              direction="next"
              link={next}
            />
          ) : null}
        </div>
        {action ? (
          <div className="flex justify-end max-lg:hidden">{action}</div>
        ) : null}
      </div>
    </nav>
  )
}

export interface PartSwitcherItem {
  /** The part's whole work is done: a dot in its corner. */
  done: boolean
  /** Some question in the part is flagged: an amber dot. */
  flagged?: boolean
  part: number
  /** Accessible name, e.g. "Part 2, 4 of 10 answered". */
  label: string
  /** Visible text; the part number when omitted. */
  text?: string
  title: string
}

/** Joined part buttons (1 2 3 4, or Task 1 Task 2). */
export function PartSwitcher({
  current,
  items,
  onChange,
}: {
  current: number
  items: PartSwitcherItem[]
  onChange: (part: number) => void
}) {
  const t = useMessages().ielts.navigator

  return (
    // Segmented part switcher (aria-pressed): documented raw exception.
    <div
      aria-label={t.choosePart}
      className="border-line rounded-control flex overflow-hidden border"
      role="group"
    >
      {items.map(item => {
        const active = item.part === current

        return (
          <button
            aria-label={item.label}
            aria-pressed={active}
            className={cn(
              'border-line relative grid h-11 min-w-11 place-items-center border-l px-1.5 font-sans text-sm font-semibold tabular-nums transition-colors first:border-l-0 md:h-8 md:min-w-8',
              item.text && 'px-3',
              active
                ? 'bg-cta text-cta-fg'
                : 'bg-surface hover:bg-tint hover-pop'
            )}
            key={item.part}
            onClick={() => onChange(item.part)}
            title={item.title}
            type="button"
          >
            {item.text ?? item.part}
            {item.done ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-1 right-1 size-1.5 rounded-full',
                  active ? 'bg-surface' : 'bg-brand'
                )}
              />
            ) : null}
            {item.flagged ? (
              <span
                aria-hidden="true"
                className="bg-notice absolute bottom-1 left-1 size-1.5 rounded-full"
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

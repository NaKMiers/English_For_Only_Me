'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export interface SkillLinkTarget {
  href: string
  label: string
}

interface Props {
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
  'border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control inline-flex h-9 shrink-0 items-center gap-1 border-2 px-2.5 font-sans text-sm font-black transition-colors sm:gap-1.5 sm:px-3'

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
 * The runner's small centred bottom bar, shared by every skill: the previous
 * skill, the skill's own controls, then the next skill.
 */
export function RunnerFooter({
  children,
  next = null,
  prev = null,
  top,
}: Props) {
  // With both skill links the row is too wide for a phone: arrows only there.
  const compact = Boolean(prev && next)

  return (
    <nav
      aria-label="Test navigation"
      className="border-manga-black bg-manga-white shrink-0 border-t-3 px-3 py-2"
    >
      {top}
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
    </nav>
  )
}

export interface PartSwitcherItem {
  /** The part's whole work is done: a dot in its corner. */
  done: boolean
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
  return (
    // Segmented part switcher (aria-pressed): documented raw exception.
    <div
      aria-label="Choose part"
      className="border-manga-black rounded-control flex overflow-hidden border-2"
      role="group"
    >
      {items.map(item => {
        const active = item.part === current

        return (
          <button
            aria-label={item.label}
            aria-pressed={active}
            className={cn(
              'border-manga-black relative grid h-8 min-w-8 place-items-center border-l-2 px-1.5 font-sans text-sm font-black tabular-nums transition-colors first:border-l-0',
              item.text && 'px-3',
              active
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white hover:bg-manga-paper-soft'
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
                  active ? 'bg-manga-white' : 'bg-manga-red'
                )}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

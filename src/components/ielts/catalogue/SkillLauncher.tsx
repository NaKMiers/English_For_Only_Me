'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { ExamButton } from '@/components/ielts/ui'
import { cn } from '@/lib/utils'
import type { IeltsSkill } from '@/modules/ielts/constants'

type Mode = 'practice' | 'mock'
type Choice = number | 'full'

interface Props {
  /** Most recent finished attempt, linked under the options. */
  latest: { href: string; label: string } | null
  /** Why the timed test cannot start (listening without audio), or null. */
  mockBlockedReason: string | null
  /** Meta shown on the Full test row per mode, e.g. "All parts" / "60 min". */
  fullMeta: Record<Mode, string>
  parts: Array<{ part: number; label: string; meta: string }>
  partsNoun: string
  skill: IeltsSkill
  slug: string
  title: string
}

const MODES: Array<{ label: string; value: Mode }> = [
  { label: 'Practice', value: 'practice' },
  { label: 'Mock', value: 'mock' },
]

export function launchHref(
  slug: string,
  skill: IeltsSkill,
  mode: Mode,
  choice: Choice
) {
  if (mode === 'mock') return `/ielts/${slug}/${skill}/mock`

  return choice === 'full'
    ? `/ielts/${slug}/${skill}`
    : `/ielts/${slug}/${skill}?part=${choice}`
}

/**
 * One skill of a test: pick Practice or Mock at the top right, choose a part
 * or the full test, then Go. Mock is the real timed exam, so only the full
 * test can be chosen there; the part rows stay visible but greyed out.
 */
export function SkillLauncher({
  fullMeta,
  latest,
  mockBlockedReason,
  parts,
  partsNoun,
  skill,
  slug,
  title,
}: Props) {
  const [mode, setMode] = useState<Mode>('practice')
  const [choice, setChoice] = useState<Choice>('full')
  const isMock = mode === 'mock'
  const blocked = isMock && mockBlockedReason !== null
  const selected: Choice = isMock ? 'full' : choice
  const options: Array<{ label: string; meta: string; value: Choice }> = [
    ...parts.map(item => ({
      label: item.label,
      meta: item.meta,
      value: item.part as Choice,
    })),
    { label: 'Full test', meta: fullMeta[mode], value: 'full' },
  ]

  return (
    <section
      aria-label={title}
      className="border-manga-black bg-manga-white rounded-panel keep-frame grid content-start overflow-hidden border-2 shadow-[3px_3px_0_var(--manga-black)]"
    >
      <header className="border-manga-black flex items-center justify-between gap-2 border-b-2 px-4 py-2.5">
        <div className="grid min-w-0">
          <h2 className="font-sans text-lg leading-tight font-black">
            {title}
          </h2>
          <span className="text-manga-ink-soft text-xs font-semibold">
            {partsNoun}
          </span>
        </div>
        {/* Mode toggle (aria-pressed): documented raw-button exception. */}
        <div
          aria-label={`${title} mode`}
          className="border-manga-black rounded-control flex shrink-0 overflow-hidden border-2"
          role="group"
        >
          {MODES.map(item => (
            <button
              aria-pressed={mode === item.value}
              className={cn(
                'border-manga-black h-8 border-l-2 px-2.5 font-sans text-xs font-black transition-colors first:border-l-0',
                mode === item.value
                  ? 'bg-manga-black text-manga-white'
                  : 'bg-manga-white hover:bg-manga-paper-soft'
              )}
              key={item.value}
              onClick={() => setMode(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <fieldset className="grid py-1.5">
        <legend className="sr-only">Choose what to {mode}</legend>
        {options.map(option => {
          const disabled =
            (isMock && option.value !== 'full') ||
            (option.value === 'full' && blocked)
          const checked = selected === option.value

          return (
            <label
              className={cn(
                'flex min-h-10 items-center gap-3 px-4 text-sm font-semibold transition-colors',
                option.value === 'full' && 'font-black',
                disabled
                  ? 'text-manga-ink-soft cursor-not-allowed opacity-45'
                  : 'hover:bg-manga-paper-soft cursor-pointer',
                checked && !disabled && 'bg-manga-paper-soft'
              )}
              key={option.value}
            >
              <input
                checked={checked}
                className="peer sr-only"
                disabled={disabled}
                name={`${slug}-${skill}-choice`}
                onChange={() => setChoice(option.value)}
                type="radio"
                value={String(option.value)}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'border-manga-black peer-focus-visible:ring-manga-red/40 grid size-4 shrink-0 place-items-center rounded-full border-2 peer-focus-visible:ring-4',
                  checked && !disabled && 'bg-manga-black'
                )}
              >
                {checked && !disabled ? (
                  <span className="bg-manga-white size-1.5 rounded-full" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">{option.label}</span>
              <span className="text-manga-ink-soft text-xs font-semibold">
                {option.meta}
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="border-manga-black/15 grid gap-2 border-t-2 px-4 py-3">
        {latest ? (
          <Link
            className="hover:text-manga-red flex items-center justify-between gap-3 text-sm font-semibold transition-colors"
            href={latest.href}
          >
            Latest result
            <span className="font-sans text-xs font-black tabular-nums">
              {latest.label}
            </span>
          </Link>
        ) : null}
        {blocked ? (
          <p className="text-manga-ink-soft text-xs font-semibold">
            {mockBlockedReason}
          </p>
        ) : null}
        {blocked ? (
          <ExamButton
            className="w-full"
            disabled
            tone="ink"
            type="button"
          >
            Go
          </ExamButton>
        ) : (
          <ExamButton
            className="w-full"
            href={launchHref(slug, skill, mode, selected)}
            icon={
              <Play
                aria-hidden="true"
                className="size-4 fill-current"
              />
            }
            tone="ink"
          >
            Go
          </ExamButton>
        )}
      </div>
    </section>
  )
}

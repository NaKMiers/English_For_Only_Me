'use client'

import { BookOpen, Headphones, PenLine, Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { ExamButton } from '@/components/ielts/ui'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
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

const MODES: Mode[] = ['practice', 'mock']

const SKILL_ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
} as const

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
  const t = useMessages().ielts
  const [mode, setMode] = useState<Mode>('practice')
  const [choice, setChoice] = useState<Choice>('full')
  const SkillIcon = SKILL_ICONS[skill]
  const isMock = mode === 'mock'
  const blocked = isMock && mockBlockedReason !== null
  const selected: Choice = isMock ? 'full' : choice
  const options: Array<{ label: string; meta: string; value: Choice }> = [
    ...parts.map(item => ({
      label: item.label,
      meta: item.meta,
      value: item.part as Choice,
    })),
    { label: t.launcher.fullTest, meta: fullMeta[mode], value: 'full' },
  ]

  return (
    <section
      aria-label={title}
      className="border-line bg-surface rounded-panel keep-frame shadow-card grid content-start overflow-hidden border"
    >
      <header className="bg-pastel-peach/70 flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-surface text-accent-orange grid size-10 shrink-0 place-items-center rounded-full"
          >
            <SkillIcon className="size-5" />
          </span>
          <div className="grid min-w-0">
            <h2 className="font-sans text-lg leading-tight font-medium">
              {title}
            </h2>
            <span className="text-ink-soft text-xs">{partsNoun}</span>
          </div>
        </div>
        {/* Mode toggle (aria-pressed): documented raw-button exception. */}
        <div
          aria-label={format(t.launcher.modeGroup, { skill: title })}
          className="bg-surface flex shrink-0 gap-0.5 rounded-full p-0.5"
          role="group"
        >
          {MODES.map(item => (
            <button
              aria-pressed={mode === item}
              className={cn(
                'h-8 rounded-full px-3 font-sans text-xs font-medium transition-colors',
                mode === item ? 'bg-cta text-cta-fg' : 'hover:bg-tint'
              )}
              key={item}
              onClick={() => setMode(item)}
              type="button"
            >
              {t.modes[item]}
            </button>
          ))}
        </div>
      </header>

      <fieldset className="grid py-1.5">
        <legend className="sr-only">{t.launcher.choose[mode]}</legend>
        {options.map(option => {
          const disabled =
            (isMock && option.value !== 'full') ||
            (option.value === 'full' && blocked)
          const checked = selected === option.value

          return (
            <label
              className={cn(
                'flex min-h-10 items-center gap-3 px-4 text-sm transition-colors',
                option.value === 'full' && 'font-medium',
                disabled
                  ? 'text-ink-soft cursor-not-allowed opacity-45'
                  : 'hover:bg-tint cursor-pointer',
                checked && !disabled && 'bg-tint'
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
                  'border-line peer-focus-visible:ring-brand/40 grid size-4 shrink-0 place-items-center rounded-full border peer-focus-visible:ring-4',
                  checked && !disabled && 'border-cta bg-cta'
                )}
              >
                {checked && !disabled ? (
                  <span className="bg-cta-fg size-1.5 rounded-full" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">{option.label}</span>
              <span className="text-ink-soft text-xs tabular-nums">
                {option.meta}
              </span>
            </label>
          )
        })}
      </fieldset>

      <div className="border-line grid gap-2 border-t px-4 py-3">
        {latest ? (
          <Link
            className="hover:text-brand flex items-center justify-between gap-3 text-sm transition-colors"
            href={latest.href}
          >
            {t.launcher.latestResult}
            <span className="font-sans text-xs font-semibold tabular-nums">
              {latest.label}
            </span>
          </Link>
        ) : null}
        {blocked ? (
          <p className="text-ink-soft text-xs font-normal">
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
            {t.launcher.go}
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
            {t.launcher.go}
          </ExamButton>
        )}
      </div>
    </section>
  )
}

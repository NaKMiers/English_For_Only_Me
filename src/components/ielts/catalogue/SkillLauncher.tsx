'use client'

import { ChevronDown, Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { ExamButton } from '@/components/ielts/ui'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Segmented } from '@/components/ui/segmented'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { IeltsSkill } from '@/modules/ielts/constants'

import { SKILL_ICONS } from './SkillPips'

export type Mode = 'practice' | 'mock'
type Choice = number | 'full'

interface Props {
  /** The recommended skill starts open; the others fold. */
  defaultOpen?: boolean
  /** Practice or mock, chosen once for the whole test. */
  mode: Mode
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
 * One skill of a test as a folding row: icon, name and latest band; open it
 * to choose a part or the full test, then Go. The Practice / Mock choice is
 * made once for the whole test (TestLaunchers). Mock is the real timed exam,
 * so only the full test can be chosen there.
 */
export function SkillLauncher({
  defaultOpen = false,
  fullMeta,
  latest,
  mockBlockedReason,
  mode,
  parts,
  partsNoun,
  skill,
  slug,
  title,
}: Props) {
  const t = useMessages().ielts
  const [choice, setChoice] = useState<Choice>('full')
  const SkillIcon = SKILL_ICONS[skill]
  const isMock = mode === 'mock'
  const blocked = isMock && mockBlockedReason !== null
  const selected: Choice = isMock ? 'full' : choice
  // Minutes only on the full test: per part they were numbers to scan.
  const options: Array<{ label: string; meta: string; value: Choice }> = [
    ...parts.map(item => ({
      label: item.label,
      meta: '',
      value: item.part as Choice,
    })),
    { label: t.launcher.fullTest, meta: fullMeta[mode], value: 'full' },
  ]

  return (
    <Collapsible
      className="border-line bg-surface rounded-panel keep-frame overflow-hidden border"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger
        aria-label={title}
        className="soft-press hover-pop group flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left"
      >
        <span
          aria-hidden="true"
          className="bg-pastel-peach text-accent-orange grid size-10 shrink-0 place-items-center rounded-full"
        >
          <SkillIcon className="size-5" />
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="font-sans text-lg leading-tight font-medium">
            {title}
          </span>
          <span className="text-ink-soft text-xs">{partsNoun}</span>
        </span>
        {latest ? (
          <span className="text-ink-soft shrink-0 font-sans text-xs font-medium tabular-nums">
            {latest.label}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 transition-transform group-data-panel-open:rotate-180"
        />
      </CollapsibleTrigger>

      <CollapsiblePanel>
        <fieldset className="border-line grid border-t py-1.5">
          <legend className="sr-only">{t.launcher.choose[mode]}</legend>
          {options.map(option => {
            const disabled =
              (isMock && option.value !== 'full') ||
              (option.value === 'full' && blocked)
            const checked = selected === option.value

            return (
              <label
                className={cn(
                  'flex min-h-11 items-center gap-3 px-4 text-sm transition-colors',
                  option.value === 'full' && 'font-medium',
                  disabled
                    ? 'text-ink-soft cursor-not-allowed opacity-45'
                    : 'hover:bg-tint cursor-pointer',
                  checked && !disabled && 'bg-tint'
                )}
                key={option.value}
              >
                {/* Raw radio behind a styled dot: keeps native keyboard and
                    disabled behaviour with the exam paper's look. */}
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
                {option.meta ? (
                  <span className="text-ink-soft text-xs tabular-nums">
                    {option.meta}
                  </span>
                ) : null}
              </label>
            )
          })}
        </fieldset>

        <div className="border-line grid gap-2 border-t px-4 py-3">
          {latest ? (
            <Link
              className="soft-press hover-pop hover:text-brand rounded-control flex min-h-11 items-center justify-between gap-3 text-sm"
              href={latest.href}
            >
              {t.launcher.latestResult}
              <span className="font-sans text-xs font-medium tabular-nums">
                {latest.label}
              </span>
            </Link>
          ) : null}
          {blocked ? (
            <p className="text-ink-soft text-xs font-normal">
              {mockBlockedReason}
            </p>
          ) : null}
          {/* Paper: the page's one strong action is the journey's next stop. */}
          {blocked ? (
            <ExamButton
              className="w-full"
              disabled
              tone="paper"
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
              tone="paper"
            >
              {t.launcher.go}
            </ExamButton>
          )}
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}

type LauncherProps = Omit<Props, 'defaultOpen' | 'mode'>

/**
 * Every skill of a test under one Practice / Mock switch (one choice for the
 * test, not one per card); the recommended skill starts open.
 */
export function TestLaunchers({
  recommended,
  skills,
}: {
  recommended: IeltsSkill | null
  skills: LauncherProps[]
}) {
  const t = useMessages().ielts
  const [mode, setMode] = useState<Mode>('practice')

  return (
    <section className="grid gap-3">
      <Segmented
        className="w-fit"
        label={t.launcher.modeGroupTest}
        onChange={setMode}
        options={MODES.map(item => ({ label: t.modes[item], value: item }))}
        value={mode}
      />
      <div className="grid gap-2">
        {skills.map(item => (
          <SkillLauncher
            {...item}
            defaultOpen={item.skill === recommended}
            key={item.skill}
            mode={mode}
          />
        ))}
      </div>
    </section>
  )
}

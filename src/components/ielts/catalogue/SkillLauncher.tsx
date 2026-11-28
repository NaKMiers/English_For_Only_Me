'use client'

import { Play } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { InlineNotice } from '@/components/common/InlineNotice'
import { ExamButton } from '@/components/ielts/ui'
import { Segmented } from '@/components/ui/segmented'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import type { IeltsSkill } from '@/modules/ielts/constants'

import { SKILL_ICONS } from './SkillPips'

export type Mode = 'practice' | 'mock'
type Choice = number | 'full'

interface Props {
  /**
   * The skill to take next on this test (the first without a band): its card
   * wears the pink ring and the page's one `ink` Go.
   */
  isNext?: boolean
  /** Practice or mock, chosen once for the whole test. */
  mode: Mode
  /** Most recent finished attempt, linked under the options. */
  latest: { href: string; label: string } | null
  /** Why the timed test cannot start (listening without audio), or null. */
  mockBlockedReason: string | null
  /** Meta shown on the Full test row per mode, e.g. "All parts" / "60 min". */
  fullMeta: Record<Mode, string>
  parts: Array<{ part: number; label: string }>
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
 * One skill of a test as an open card: icon, name and latest band, then the
 * parts or the full test, then Go. The Practice / Mock choice is made once
 * for the whole test (TestLaunchers). Mock is the real timed exam, so it
 * shows the full test alone: parts are not hidden-but-disabled noise.
 */
export function SkillLauncher({
  fullMeta,
  isNext = false,
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
    ...(isMock
      ? []
      : parts.map(item => ({
          label: item.label,
          meta: '',
          value: item.part as Choice,
        }))),
    { label: t.launcher.fullTest, meta: fullMeta[mode], value: 'full' },
  ]

  return (
    <section
      aria-label={title}
      className={cn(
        'border-line bg-surface rounded-panel keep-frame flex w-[80%] shrink-0 snap-start flex-col overflow-hidden border sm:w-auto',
        isNext && 'ring-brand/35 ring-4'
      )}
      data-next-skill={isNext ? '' : undefined}
    >
      <div className="flex min-h-14 items-center gap-3 px-4 py-2">
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
      </div>

      {/* flex-1 keeps every Go on one line when the cards sit side by side.
          A blocked mock shows only why (below), not faded options. */}
      {blocked ? (
        <div className="border-line flex-1 border-t p-3">
          <InlineNotice>{mockBlockedReason}</InlineNotice>
        </div>
      ) : (
        <fieldset className="border-line grid flex-1 content-start border-t py-1.5">
          <legend className="sr-only">{t.launcher.choose[mode]}</legend>
          {options.map(option => {
            const checked = selected === option.value

            return (
              <label
                className={cn(
                  'flex min-h-11 items-center gap-3 px-4 text-sm transition-colors',
                  option.value === 'full' && 'font-medium',
                  'hover:bg-tint cursor-pointer',
                  checked && 'bg-tint'
                )}
                key={option.value}
              >
                {/* Raw radio behind a styled dot: keeps native keyboard and
                    disabled behaviour with the exam paper's look. */}
                <input
                  checked={checked}
                  className="peer sr-only"
                  name={`${slug}-${skill}-choice`}
                  onChange={() => setChoice(option.value)}
                  type="radio"
                  value={String(option.value)}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'border-line peer-focus-visible:ring-brand/40 grid size-4 shrink-0 place-items-center rounded-full border peer-focus-visible:ring-4',
                    checked && 'border-cta bg-cta'
                  )}
                >
                  {checked ? (
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
      )}

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
        {/* The test's next skill gets the page's one ink Go; the others
            stay paper. A blocked mock has no Go at all. */}
        {blocked ? null : (
          <ExamButton
            className="w-full"
            href={launchHref(slug, skill, mode, selected)}
            icon={
              <Play
                aria-hidden="true"
                className="size-4 fill-current"
              />
            }
            tone={isNext ? 'ink' : 'paper'}
          >
            {t.launcher.go}
          </ExamButton>
        )}
      </div>
    </section>
  )
}

type LauncherProps = Omit<Props, 'mode'>

/**
 * Every skill of a test under one Practice / Mock switch (one choice for the
 * test, not one per card); every skill is open, nothing to unfold. The
 * skills sit side by side so a short page stays short: three columns from
 * sm, a swipeable row with the next card peeking on phones.
 */
export function TestLaunchers({
  nextSkill = null,
  skills,
}: {
  /** The skill to take next (`nextSkillOf`), or null when all are banded. */
  nextSkill?: IeltsSkill | null
  skills: Omit<LauncherProps, 'isNext'>[]
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
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {skills.map(item => (
          <SkillLauncher
            {...item}
            isNext={item.skill === nextSkill}
            key={item.skill}
            mode={mode}
          />
        ))}
      </div>
    </section>
  )
}

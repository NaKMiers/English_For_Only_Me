import { BookOpen, Headphones, PenLine } from 'lucide-react'

import { format } from '@/i18n/format'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import { IELTS_SKILL_LABELS, type IeltsSkill } from '@/modules/ielts/constants'
import { cn } from '@/lib/utils'

export const SKILL_ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
} as const

interface Props {
  bands: IeltsTestBands
  /** `{skill}: best band {band}` from the catalogue messages. */
  bestBandLabel: string
  className?: string
  entry: { id: string; skills: { skill: IeltsSkill }[] }
  /** Fill for a skill with a band, e.g. `bg-accent-orange text-surface`. */
  fill: string
  size?: 'sm' | 'md'
}

/**
 * One light per skill of a test: lit (filled, showing the best band) once
 * the skill has a band, an empty dashed socket with the skill's icon before.
 * The row reads as "how much of this test is done" at a glance.
 */
export function SkillPips({
  bands,
  bestBandLabel,
  className,
  entry,
  fill,
  size = 'sm',
}: Props) {
  const box = size === 'md' ? 'size-11 text-xs' : 'size-8 text-[10px]'

  return (
    <span className={cn('flex items-center gap-1.5', className)}>
      {entry.skills.map(({ skill }) => {
        const Icon = SKILL_ICONS[skill]
        const band = bands[entry.id]?.[skill]

        if (band === undefined)
          return (
            <span
              aria-label={IELTS_SKILL_LABELS[skill]}
              className={cn(
                'border-line-strong text-ink-soft grid shrink-0 place-items-center rounded-full border-2 border-dashed',
                box
              )}
              key={skill}
              role="img"
            >
              <Icon
                aria-hidden="true"
                className={size === 'md' ? 'size-4' : 'size-3.5'}
              />
            </span>
          )

        return (
          <span
            aria-label={format(bestBandLabel, {
              band: band.toFixed(1),
              skill: IELTS_SKILL_LABELS[skill],
            })}
            className={cn(
              'grid shrink-0 place-items-center rounded-full font-sans font-semibold tabular-nums shadow-sm',
              box,
              fill
            )}
            key={skill}
            role="img"
          >
            {band.toFixed(1)}
          </span>
        )
      })}
    </span>
  )
}

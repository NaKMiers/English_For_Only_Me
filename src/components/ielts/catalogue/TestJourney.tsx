import {
  CircleCheck,
  GraduationCap,
  History,
  Target,
  Trophy,
} from 'lucide-react'

import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import type { IeltsSkill } from '@/modules/ielts/constants'

import { SKILL_ICONS, SkillPips } from './SkillPips'
import { nextSkillOf } from './testPath'

interface Props {
  attempts: IeltsAttemptSummary[]
  entry: { id: string; skills: { skill: IeltsSkill }[] }
  messages: Messages
  slug: string
  targetBand: number
}

/** Best band per skill of one test, from its finished attempts. */
export function bandsFromAttempts(
  testId: string,
  attempts: IeltsAttemptSummary[]
): IeltsTestBands {
  const best: Partial<Record<IeltsSkill, number>> = {}

  for (const attempt of attempts)
    if (attempt.status !== 'in_progress' && attempt.band !== null)
      best[attempt.skill] = Math.max(best[attempt.skill] ?? 0, attempt.band)

  return { [testId]: best }
}

/**
 * One test's journey card: how many of its skills have a band (the pips are
 * the stations), the skill that clears it, a few numbers and one next stop
 * straight into the next skill's runner.
 */
export function TestJourney({
  attempts,
  entry,
  messages,
  slug,
  targetBand,
}: Props) {
  const t = messages.ielts.testJourney
  const bands = bandsFromAttempts(entry.id, attempts)
  const banded = entry.skills.filter(
    ({ skill }) => bands[entry.id]?.[skill] !== undefined
  ).length
  const next = nextSkillOf(entry, bands)
  const left = entry.skills.length - banded
  const values = Object.values(bands[entry.id] ?? {})
  const best = values.length ? Math.max(...values) : null
  const skillLabel = (skill: IeltsSkill) => messages.ielts.skills[skill]
  const NextIcon = next ? SKILL_ICONS[next] : Trophy

  return (
    <JourneyCard
      headline={
        <JourneyHeadline
          total={format(t.ofTotal, { total: entry.skills.length })}
          unit={t.unit}
          value={banded}
        />
      }
      layout="stacked"
      metaphor={
        <SkillPips
          bands={bands}
          bestBandLabel={messages.ielts.catalogue.bestBand}
          entry={entry}
          fill="bg-accent-orange text-surface"
          size="md"
        />
      }
      milestone={
        <MilestoneNote>
          {next && left === 1
            ? format(t.clears, { skill: skillLabel(next) })
            : !next
              ? t.cleared
              : null}
        </MilestoneNote>
      }
      module="ielts"
      nextStop={
        <NextStopCard
          actionIcon={<NextIcon aria-hidden="true" />}
          actionLabel={next ? format(t.start, { skill: skillLabel(next) }) : ''}
          done={
            next
              ? undefined
              : { icon: <CircleCheck aria-hidden="true" />, text: t.cleared }
          }
          href={next ? `/ielts/${slug}/${next}` : null}
          pinLabel={messages.common.journey.nextStop}
          title={next ? skillLabel(next) : ''}
          variant="compact"
        />
      }
      stats={
        <StatStrip>
          <StatChip
            icon={GraduationCap}
            label={t.bestBand}
            tone="ielts"
            value={best !== null ? best.toFixed(1) : '-'}
          />
          <StatChip
            icon={Target}
            label={t.target}
            tone="ielts"
            value={targetBand.toFixed(1)}
          />
          <StatChip
            icon={History}
            label={t.attempts}
            tone="ielts"
            value={String(
              attempts.filter(attempt => attempt.status !== 'in_progress')
                .length
            )}
          />
        </StatStrip>
      }
      title={t.title}
      titleId="test-journey-title"
    />
  )
}

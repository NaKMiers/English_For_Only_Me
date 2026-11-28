import {
  ArrowRight,
  BookMarked,
  CalendarCheck,
  CircleCheck,
  Footprints,
  GraduationCap,
  Mountain,
  MountainSnow,
  Tent,
  Trophy,
  type LucideIcon,
} from 'lucide-react'

import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import {
  JourneyCard,
  JourneyHeadline,
  MilestoneNote,
} from '@/components/journey/JourneyCard'
import { NextStopCard } from '@/components/journey/NextStopCard'
import { DrawerHandle } from '@/components/journey/SideDrawer'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { cn } from '@/lib/utils'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsOverallEstimate } from '@/modules/ielts/scoring/overall'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import type { CatalogueGroup } from './catalogueGroups'
import { SKILL_ICONS } from './SkillPips'
import {
  JOURNEY_MILESTONES,
  type JourneyMilestoneKey,
  journeyTotals,
  nextMilestone,
  nextSkillOf,
  pickNextTest,
  stepsThisWeek,
} from './testPath'

interface Props {
  attempts: IeltsAttemptSummary[]
  bands: IeltsTestBands
  className?: string
  groups: CatalogueGroup<IeltsCatalogEntry>[]
  messages: Messages
  now: Date
  overall: IeltsOverallEstimate | null
}

const MILESTONE_ICONS: Record<JourneyMilestoneKey, LucideIcon> = {
  camp: Tent,
  ridge: Mountain,
  peak: MountainSnow,
  summit: Trophy,
}

/**
 * The IELTS journey on the shared `JourneyCard`. The trail is the metaphor:
 * four big milestones on a thick path, the learner's footprints on it and
 * the next milestone ringed. Around it: the step count, four numbers as
 * chips, and one compact next stop straight into the next skill.
 */
export function JourneyHero({
  attempts,
  bands,
  className,
  groups,
  messages,
  now,
  overall,
}: Props) {
  const t = messages.ielts.journey
  const totals = journeyTotals(groups, bands)
  const percent =
    totals.totalSteps > 0 ? (totals.steps / totals.totalSteps) * 100 : 0
  const milestone = nextMilestone(totals.steps, totals.totalSteps)
  const next = pickNextTest(groups, bands)
  const nextSkill = next ? nextSkillOf(next.entry, bands) : null
  const NextIcon = nextSkill ? SKILL_ICONS[nextSkill] : ArrowRight
  const nextLabel = next
    ? (groups
        .find(group => group.heading === next.heading)
        ?.tests.find(test => test.entry.id === next.entry.id)?.label ??
      next.entry.title)
    : null
  const chips: { icon: LucideIcon; label: string; value: string }[] = [
    {
      icon: GraduationCap,
      label: t.band,
      value: overall ? overall.band.toFixed(1) : '-',
    },
    {
      icon: CircleCheck,
      label: t.testsCleared,
      value: `${totals.testsDone}/${totals.totalTests}`,
    },
    {
      icon: BookMarked,
      label: t.booksCleared,
      value: `${totals.booksDone}/${totals.totalBooks}`,
    },
    {
      icon: CalendarCheck,
      label: t.thisWeek,
      value: String(stepsThisWeek(attempts, now)),
    },
  ]

  return (
    <JourneyCard
      className={className}
      handle={
        <DrawerHandle
          accentClassName="text-accent-orange"
          hideLabel={t.progress.hide}
          showLabel={t.progress.show}
        />
      }
      headline={
        <span
          aria-label={format(t.stepsLabel, {
            done: totals.steps,
            total: totals.totalSteps,
          })}
          className="block"
          role="img"
        >
          <JourneyHeadline
            total={format(t.ofSteps, { total: totals.totalSteps })}
            unit={t.stepsUnit}
            value={totals.steps}
          />
        </span>
      }
      layout="stacked"
      metaphor={
        // The trail: thick path, big milestones, footprints where you are.
        <div className="relative mx-7 h-[76px] sm:h-[92px]">
          <div
            aria-label={format(t.trail, {
              done: totals.steps,
              total: totals.totalSteps,
            })}
            aria-valuemax={totals.totalSteps}
            aria-valuemin={0}
            aria-valuenow={totals.steps}
            className="bg-surface/80 absolute inset-x-0 top-[16px] h-3 overflow-hidden rounded-full sm:top-[22px]"
            role="progressbar"
          >
            <div
              className="bg-accent-orange motion-grow-x h-full rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
          {JOURNEY_MILESTONES.map(item => {
            const reached = percent >= item.at * 100
            const target = milestone?.key === item.key
            const Icon = MILESTONE_ICONS[item.key]

            return (
              <span
                className="absolute top-0 grid -translate-x-1/2 justify-items-center gap-1.5"
                key={item.key}
                style={{ left: `${item.at * 100}%` }}
              >
                <span
                  className={cn(
                    'grid size-11 place-items-center rounded-full border-[3px] sm:size-14',
                    reached
                      ? 'bg-accent-orange text-surface border-surface shadow-sm'
                      : target
                        ? 'bg-surface text-accent-orange border-accent-orange ring-accent-orange/20 ring-4'
                        : 'bg-surface text-ink-soft border-line-strong border-dashed'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-5 sm:size-6"
                  />
                </span>
                {/* Camp and Ridge sit a fifth of the trail apart, too close
                    for two labels on a phone: there only the milestone
                    ahead keeps its word (the line under the trail names it
                    too); the rest stay for screen readers. */}
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    reached || target ? 'font-medium' : 'text-ink-soft',
                    !target && 'max-sm:sr-only'
                  )}
                >
                  {t.milestones[item.key]}
                </span>
              </span>
            )
          })}
          {/* Footprints: the learner's spot on the trail (a marker). */}
          <span
            aria-hidden="true"
            className="bg-accent-orange text-surface border-surface absolute top-[8px] grid size-7 -translate-x-1/2 place-items-center rounded-full border-2 shadow-sm sm:top-[14px]"
            style={{ left: `${percent}%` }}
            title={messages.common.journey.youAreHere}
          >
            <Footprints className="size-3.5" />
          </span>
        </div>
      }
      milestone={
        <MilestoneNote className="text-ink-soft font-normal">
          {milestone
            ? plural(messages.common.journey.toMilestone, milestone.left, {
                milestone: t.milestones[milestone.key],
              })
            : t.summit}
        </MilestoneNote>
      }
      module="ielts"
      nextStop={
        <NextStopCard
          actionIcon={<NextIcon aria-hidden="true" />}
          actionLabel={nextSkill ? IELTS_SKILL_LABELS[nextSkill] : ''}
          detail={next?.heading}
          done={
            next && nextLabel && nextSkill
              ? undefined
              : { icon: <Trophy aria-hidden="true" />, text: t.allDone }
          }
          href={
            next && nextSkill ? `/ielts/${next.entry.slug}/${nextSkill}` : null
          }
          pinLabel={messages.common.journey.nextStop}
          title={nextLabel ?? ''}
          variant="compact"
        />
      }
      stats={
        <StatStrip>
          {chips.map(chip => (
            <StatChip
              icon={chip.icon}
              key={chip.label}
              label={chip.label}
              tone="ielts"
              value={chip.value}
            />
          ))}
        </StatStrip>
      }
      title={t.title}
      titleId="ielts-journey-title"
    />
  )
}

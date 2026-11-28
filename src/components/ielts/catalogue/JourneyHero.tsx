import {
  BookMarked,
  CalendarCheck,
  Check,
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
import { JourneyCard, JourneyHeadline } from '@/components/journey/JourneyCard'
import { DrawerHandle } from '@/components/journey/SideDrawer'
import { StatChip, StatStrip } from '@/components/journey/StatChip'
import { cn } from '@/lib/utils'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import type { IeltsOverallEstimate } from '@/modules/ielts/scoring/overall'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import type { CatalogueGroup } from './catalogueGroups'
import {
  JOURNEY_MILESTONES,
  type JourneyMilestoneKey,
  journeySegments,
  journeyTotals,
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
 * The IELTS journey on the shared `JourneyCard`, kept short. The trail is the
 * metaphor: four big milestones on a thick path, the steps left in each stage
 * written above it, the learner's footprints on it and the next milestone
 * ringed. The step count sits top left, four numbers as chips top right.
 * No next stop card: the page's floating Continue button scrolls to the next
 * test station.
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
  const segments = journeySegments(totals.steps, totals.totalSteps)
  const target = segments.find(segment => segment.state === 'current')?.key
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
            unit={plural(t.stepsUnit, totals.steps)}
            value={totals.steps}
          />
        </span>
      }
      layout="stacked"
      metaphor={
        // The trail: thick path, big milestones, footprints where you are,
        // and above each stage, midway between its milestones, the steps
        // left in it: plain numbers, so the milestones keep the eye.
        <div className="relative mx-7 mt-5 h-[76px] sm:h-[92px]">
          <ol
            aria-label={t.stages}
            className="contents"
          >
            {segments.map(segment => {
              const name = t.milestones[segment.key]
              const done = segment.state === 'done'
              const current = segment.state === 'current'
              const spoken = done
                ? format(t.segmentDone, { milestone: name })
                : plural(t.segmentLeft, segment.left, { milestone: name })

              return (
                <li
                  className="absolute -top-5 flex h-5 flex-col justify-end"
                  data-journey-stage={segment.state}
                  key={segment.key}
                  style={{
                    left: `calc(${segment.from * 100}% + 4px)`,
                    width: `calc(${(segment.to - segment.from) * 100}% - 8px)`,
                  }}
                  title={spoken}
                >
                  <span
                    className={cn(
                      'flex justify-center text-xs leading-4 whitespace-nowrap',
                      done
                        ? 'text-accent-orange'
                        : current
                          ? 'text-accent-orange font-medium'
                          : 'text-ink-soft'
                    )}
                  >
                    <span className="sr-only">{spoken}</span>
                    {done ? (
                      <Check
                        aria-hidden="true"
                        className="size-3.5"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="tabular-nums"
                      >
                        {segment.left}
                        <span className="max-sm:hidden">
                          {' '}
                          {plural(t.segmentUnit, segment.left)}
                        </span>
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
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
            const isTarget = target === item.key
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
                      : isTarget
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
                    ahead keeps its word; the rest stay for screen readers. */}
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    reached || isTarget ? 'font-medium' : 'text-ink-soft',
                    !isTarget && 'max-sm:sr-only'
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
      module="ielts"
      stats={
        <StatStrip className="sm:justify-end">
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

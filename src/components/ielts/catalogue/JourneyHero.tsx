import {
  ArrowRight,
  BookMarked,
  CalendarCheck,
  CircleCheck,
  Footprints,
  GraduationCap,
  MapPin,
  Mountain,
  MountainSnow,
  Tent,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'

import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type { IeltsAttemptSummary } from '@/modules/ielts/attempts/attemptQueries'
import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import { IELTS_SKILL_LABELS } from '@/modules/ielts/constants'
import type { IeltsOverallEstimate } from '@/modules/ielts/scoring/overall'
import type { IeltsCatalogEntry } from '@/modules/ielts/tests/testReaders'

import type { CatalogueGroup } from './catalogueGroups'
import { ProgressToggle } from './JourneyRow'
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
 * The IELTS journey in one compact card. The trail is the hero: four big
 * milestones on a thick path, the learner's footprints on it and the next
 * milestone ringed. Around it, as little text as possible: the step count,
 * four numbers as icon chips, and one link straight into the next skill.
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
    <section
      aria-labelledby="ielts-journey-title"
      className={cn(
        // Right padding leaves room for the side card's handle.
        'border-line rounded-panel from-pastel-peach to-pastel-cream/60 relative grid min-w-0 content-between gap-5 border bg-linear-160 p-4 pr-8 sm:p-5 sm:pr-9',
        className
      )}
    >
      <h2
        className="sr-only"
        id="ielts-journey-title"
      >
        {t.title}
      </h2>

      {/* Steps on the left, the four numbers as icon chips on the right. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          aria-label={format(t.stepsLabel, {
            done: totals.steps,
            total: totals.totalSteps,
          })}
          className="flex items-center gap-2.5"
        >
          <span
            aria-hidden="true"
            className="bg-accent-orange text-surface grid size-10 place-items-center rounded-full"
          >
            <Footprints className="size-5" />
          </span>
          <span
            aria-hidden="true"
            className="font-sans text-3xl leading-none font-medium tabular-nums"
          >
            {totals.steps}
            <span className="text-ink-soft text-base font-normal">
              /{totals.totalSteps}
            </span>
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <dl className="flex flex-wrap gap-1.5">
            {chips.map(chip => {
              const Icon = chip.icon

              return (
                <div
                  className="bg-surface/80 flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1.5"
                  key={chip.label}
                  title={chip.label}
                >
                  <dt>
                    <Icon
                      aria-hidden="true"
                      className="text-accent-orange size-4"
                    />
                    <span className="sr-only">{chip.label}</span>
                  </dt>
                  <dd className="font-sans text-sm font-medium tabular-nums">
                    {chip.value}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      </div>

      {/* The trail: thick path, big milestones, footprints where you are. */}
      <div className="grid gap-1">
        <div className="relative mx-7 h-[92px]">
          <div
            aria-label={format(t.trail, {
              done: totals.steps,
              total: totals.totalSteps,
            })}
            aria-valuemax={totals.totalSteps}
            aria-valuemin={0}
            aria-valuenow={totals.steps}
            className="bg-surface/80 absolute inset-x-0 top-[22px] h-3 overflow-hidden rounded-full"
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
                    'grid size-14 place-items-center rounded-full border-[3px]',
                    reached
                      ? 'bg-accent-orange text-surface border-surface shadow-sm'
                      : target
                        ? 'bg-surface text-accent-orange border-accent-orange ring-accent-orange/20 ring-4'
                        : 'bg-surface text-ink-soft border-line-strong border-dashed'
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-6"
                  />
                </span>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    reached || target ? 'font-medium' : 'text-ink-soft'
                  )}
                >
                  {t.milestones[item.key]}
                </span>
              </span>
            )
          })}
          {/* Footprints: the learner's spot on the trail. */}
          <span
            aria-hidden="true"
            className="bg-ink text-surface absolute top-[14px] grid size-7 -translate-x-1/2 place-items-center rounded-full shadow-sm"
            style={{ left: `${percent}%` }}
            title={t.youAreAt}
          >
            <Footprints className="size-3.5" />
          </span>
        </div>
        <p className="text-ink-soft text-center text-sm">
          {milestone
            ? plural(t.toNext, milestone.left, {
                milestone: t.milestones[milestone.key],
              })
            : t.summit}
        </p>
      </div>

      {/* Next stop: one link straight into the skill to do next. */}
      {next && nextLabel && nextSkill ? (
        <Link
          aria-label={`${t.nextStop}: ${next.heading} ${nextLabel}, ${format(
            t.startSkill,
            { skill: IELTS_SKILL_LABELS[nextSkill] }
          )}`}
          className="soft-press hover-pop bg-surface group flex items-center gap-3 rounded-[20px] p-2 pl-3"
          href={`/ielts/${next.entry.slug}/${nextSkill}`}
        >
          <MapPin
            aria-hidden="true"
            className="text-brand size-5 shrink-0"
          />
          <span className="min-w-0 flex-1 truncate text-sm">
            <span className="text-ink-soft">{next.heading} · </span>
            <span className="font-medium">{nextLabel}</span>
          </span>
          <span className="bg-cta text-cta-fg inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium">
            <NextIcon
              aria-hidden="true"
              className="size-4"
            />
            {IELTS_SKILL_LABELS[nextSkill]}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      ) : (
        <p className="bg-surface flex items-center gap-3 rounded-[20px] p-3 text-sm">
          <Trophy
            aria-hidden="true"
            className="text-accent-orange size-5 shrink-0"
          />
          {t.allDone}
        </p>
      )}

      <ProgressToggle />
    </section>
  )
}

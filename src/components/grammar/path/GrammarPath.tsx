'use client'

import {
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  Dumbbell,
  Loader2,
  Lock,
  PenLine,
  Play,
  RotateCcw,
  Star,
  Trophy,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { PageHeader } from '@/components/common/PageHeader'
import { ProgressRing } from '@/components/common/ProgressRing'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CefrLevel } from '@/modules/grammar/course/types'
import type {
  GrammarPathView,
  PathLesson,
  PathNext,
  PathUnit,
} from '@/modules/grammar/path/buildGrammarPath'
import {
  firstDueLesson,
  initialOpenUnitIds,
  pathLevels,
  summarizeUnit,
  unitOfNext,
  type UnitSummary,
} from '@/modules/grammar/path/unitSummary'
import { hasPendingGrammarSessions } from '@/requests/grammarSessionsApi'

interface Props {
  path: GrammarPathView
}

function nextHref(next: PathNext) {
  switch (next.kind) {
    case 'lesson':
      return `/grammar/lessons/${next.lessonId}`
    case 'checkpoint':
      return `/grammar/units/${next.unitId}/checkpoint`
    case 'review':
      return `/grammar/lessons/${next.lessonId}/review`
    case 'weak':
      return '/grammar/practice'
    case 'done':
      return null
  }
}

function nextLabel(next: PathNext) {
  switch (next.kind) {
    case 'lesson':
      return `Continue: ${next.title}`
    case 'checkpoint':
      return `Checkpoint: ${next.title}`
    case 'review':
      return `Review: ${next.title}`
    case 'weak':
      return `Practise ${next.count} weak ${next.count === 1 ? 'question' : 'questions'}`
    case 'done':
      return 'You finished the whole path'
  }
}

function StarsInline({ stars }: { stars: number }) {
  return (
    <span
      aria-label={`${stars} of 3 stars`}
      className="flex gap-0.5"
      role="img"
    >
      {[1, 2, 3].map(index => (
        <Star
          aria-hidden
          className={cn(
            'size-3.5 stroke-2',
            index <= stars
              ? 'fill-brand text-brand'
              : 'text-line-strong fill-transparent'
          )}
          key={index}
        />
      ))}
    </span>
  )
}

const NODE_STATE_LABEL: Record<PathLesson['state'], string> = {
  due: 'due for review',
  locked: 'locked',
  mastered: 'mastered',
  open: 'open',
  passed: 'done',
}

const NODE_STYLE: Record<
  PathLesson['state'],
  { icon: typeof Play; circle: string }
> = {
  due: { circle: 'bg-brand-soft text-brand-ink', icon: RotateCcw },
  locked: {
    circle: 'border-line-strong text-ink-soft border border-dashed',
    icon: Lock,
  },
  mastered: { circle: 'bg-pastel-lilac text-accent-purple', icon: Crown },
  open: { circle: 'bg-cta text-cta-fg', icon: Play },
  passed: { circle: 'bg-pastel-mint text-accent-green', icon: Check },
}

/** One lesson as a compact tile; a click opens the lesson dialog. */
function LessonTile({
  index,
  lesson,
  onSelect,
}: {
  index: number
  lesson: PathLesson
  onSelect: () => void
}) {
  const style = NODE_STYLE[lesson.state]
  const Icon = style.icon
  const done = lesson.state !== 'open' && lesson.state !== 'locked'

  return (
    <li>
      {/* Raw button: a lesson tile that opens a dialog, not a labelled
          action button. */}
      <button
        aria-label={`${lesson.title}, ${NODE_STATE_LABEL[lesson.state]}`}
        className={cn(
          'soft-press hover-lift border-line bg-surface hover:bg-tint-soft rounded-control flex min-h-16 w-full items-center gap-3 border p-2.5 text-left',
          lesson.state === 'open' && 'border-brand/50 bg-brand-soft/40',
          lesson.state === 'locked' && 'text-ink-soft'
        )}
        onClick={onSelect}
        type="button"
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            style.circle
          )}
        >
          <Icon
            aria-hidden
            className={cn(
              'size-[18px]',
              lesson.state === 'open' && 'fill-current'
            )}
          />
        </span>
        <span className="grid min-w-0 flex-1 gap-1">
          <span className="text-ink-soft text-[11px] leading-none">
            Lesson {index + 1}
          </span>
          <span className="text-sm leading-tight font-medium">
            {lesson.title}
          </span>
        </span>
        {done ? (
          lesson.passedByTest ? (
            <span className="text-ink-soft shrink-0 text-[11px]">
              Tested out
            </span>
          ) : (
            <StarsInline stars={lesson.stars} />
          )
        ) : null}
      </button>
    </li>
  )
}

/** The unit's checkpoint (or its test-out when locked) as the last tile. */
function CheckpointTile({ unit }: { unit: PathUnit }) {
  if (unit.state === 'locked')
    return (
      <li>
        <Link
          className="soft-press border-line-strong text-ink hover:bg-tint-soft rounded-control flex min-h-16 items-center gap-3 border border-dashed p-2.5"
          href={`/grammar/units/${unit.id}/checkpoint`}
        >
          <span className="bg-pastel-peach text-accent-orange grid size-10 shrink-0 place-items-center rounded-full">
            <Trophy
              aria-hidden
              className="size-[18px]"
            />
          </span>
          <span className="text-sm font-medium">Test out</span>
        </Link>
      </li>
    )

  const locked = unit.checkpoint === 'locked'
  const passed = unit.checkpoint === 'passed'

  return (
    <li>
      <Link
        aria-disabled={locked}
        className={cn(
          'soft-press rounded-control flex min-h-16 items-center gap-3 border p-2.5',
          locked
            ? 'border-line-strong text-ink-soft pointer-events-none border-dashed'
            : 'border-line bg-pastel-peach/60 hover:bg-pastel-peach'
        )}
        href={`/grammar/units/${unit.id}/checkpoint`}
        tabIndex={locked ? -1 : undefined}
      >
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-full',
            passed
              ? 'bg-pastel-mint text-accent-green'
              : 'bg-surface text-accent-orange'
          )}
        >
          {passed ? (
            <Check
              aria-hidden
              className="size-[18px]"
            />
          ) : (
            <Trophy
              aria-hidden
              className="size-[18px]"
            />
          )}
        </span>
        <span className="text-sm font-medium">
          {passed ? 'Checkpoint passed' : 'Checkpoint'}
        </span>
      </Link>
    </li>
  )
}

/** Header line shared by the unit card and its index row. */
function UnitBadge({ summary }: { summary: UnitSummary }) {
  const complete = summary.state === 'complete'

  return (
    <ProgressRing
      percent={complete ? 100 : summary.percent}
      ringClassName={complete ? 'text-accent-green' : 'text-brand'}
      size={44}
    >
      {complete ? (
        <Check
          aria-hidden
          className="text-accent-green size-4 stroke-3"
        />
      ) : summary.state === 'locked' ? (
        <Lock
          aria-hidden
          className="text-ink-soft size-4"
        />
      ) : (
        summary.order
      )}
    </ProgressRing>
  )
}

function UnitCard({
  isCurrent,
  onOpenChange,
  onSelectLesson,
  open,
  unit,
}: {
  isCurrent: boolean
  onOpenChange: (open: boolean) => void
  onSelectLesson: (lesson: PathLesson) => void
  open: boolean
  unit: PathUnit
}) {
  const summary = summarizeUnit(unit)

  return (
    <Collapsible
      onOpenChange={onOpenChange}
      open={open}
      render={
        <section
          aria-labelledby={`unit-${unit.id}-title`}
          className={cn(
            'border-line bg-surface rounded-panel shadow-card scroll-mt-6 border',
            isCurrent && 'border-brand/40'
          )}
          id={`unit-${unit.id}`}
        />
      }
    >
      {/* The heading wraps the trigger (accordion pattern), never the
          other way round. */}
      <h2 className="font-normal">
        <CollapsibleTrigger className="group/unit hover:bg-tint-soft rounded-panel flex w-full items-center gap-3 p-3 text-left sm:gap-4 sm:p-4">
          <UnitBadge summary={summary} />
          <span className="grid min-w-0 flex-1 gap-1">
            <span className="text-ink-soft flex flex-wrap items-center gap-x-2 text-xs">
              <span>
                Unit {unit.order} · {unit.level}
              </span>
              {isCurrent ? (
                <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 font-medium">
                  Current
                </span>
              ) : null}
              {summary.dueCount > 0 ? (
                <span className="text-brand-ink flex items-center gap-1 font-medium">
                  <RotateCcw
                    aria-hidden
                    className="size-3"
                  />
                  {summary.dueCount} due
                </span>
              ) : null}
            </span>
            <span
              className="font-sans text-base leading-tight font-medium sm:text-lg"
              id={`unit-${unit.id}-title`}
            >
              {unit.title}
            </span>
          </span>
          <span className="text-ink-soft hidden shrink-0 text-right text-xs sm:grid">
            <span className="text-ink font-medium tabular-nums">
              {summary.done}/{summary.total}
            </span>
            <span className="flex items-center justify-end gap-1 tabular-nums">
              <Star
                aria-hidden
                className="fill-brand text-brand size-3"
              />
              {summary.stars}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className="text-ink-soft size-5 shrink-0 transition-transform group-data-[panel-open]/unit:rotate-180"
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsiblePanel>
        <div className="grid gap-3 px-3 pb-3 sm:px-4 sm:pb-4">
          <p className="text-ink-soft text-sm">{unit.summary}</p>
          <ol className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {unit.lessons.map((lesson, index) => (
              <LessonTile
                index={index}
                key={lesson.id}
                lesson={lesson}
                onSelect={() => onSelectLesson(lesson)}
              />
            ))}
            <CheckpointTile unit={unit} />
          </ol>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}

/** Jump list of every unit: a sticky column on desktop, a strip on phones. */
function UnitIndex({
  currentUnitId,
  onJump,
  summaries,
}: {
  currentUnitId: string | null
  onJump: (unitId: string) => void
  summaries: UnitSummary[]
}) {
  return (
    <nav
      aria-label="Units"
      className="min-w-0 lg:sticky lg:top-6 lg:self-start"
    >
      <h2 className="text-ink-soft mb-2 hidden px-1 text-xs font-medium lg:block">
        Units
      </h2>
      <ol className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:max-h-[calc(100dvh-7rem)] lg:snap-none lg:grid-cols-1 lg:gap-1 lg:overflow-x-hidden lg:overflow-y-auto lg:px-0 lg:pb-0">
        {summaries.map(summary => {
          const current = summary.id === currentUnitId

          return (
            <li
              className="shrink-0 snap-start"
              key={summary.id}
            >
              {/* Raw button: a jump link that also unfolds the unit. */}
              <button
                aria-current={current ? 'step' : undefined}
                className={cn(
                  'soft-press hover:bg-tint lg:rounded-control flex min-h-11 items-center gap-2.5 rounded-full border px-2 py-1 text-left text-sm lg:w-full lg:border-transparent',
                  current
                    ? 'border-brand/40 bg-brand-soft/50 lg:bg-brand-soft/50'
                    : 'border-line bg-surface lg:bg-transparent',
                  summary.state === 'locked' && 'text-ink-soft'
                )}
                onClick={() => onJump(summary.id)}
                type="button"
              >
                <ProgressRing
                  className="text-[10px]"
                  percent={summary.state === 'complete' ? 100 : summary.percent}
                  ringClassName={
                    summary.state === 'complete'
                      ? 'text-accent-green'
                      : 'text-brand'
                  }
                  size={28}
                  strokeWidth={3}
                >
                  {summary.order}
                </ProgressRing>
                <span className="max-w-40 min-w-0 truncate lg:max-w-none lg:flex-1">
                  {summary.title}
                </span>
                <span className="text-ink-soft hidden shrink-0 text-[11px] lg:inline">
                  {summary.level}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function GrammarPath({ path }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<{
    lesson: PathLesson
    unit: PathUnit
  } | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialOpenUnitIds(path))
  )
  const [level, setLevel] = useState<CefrLevel | 'all'>('all')
  const href = nextHref(path.next)
  const summaries = path.units.map(summarizeUnit)
  const levels = pathLevels(path.units)
  const nextUnit = unitOfNext(path)
  const nextSummary = nextUnit ? summarizeUnit(nextUnit) : null
  const dueLesson = firstDueLesson(path.units)
  const visibleUnits =
    level === 'all'
      ? path.units
      : path.units.filter(unit => unit.level === level)

  // Opening the outbox replays any finished session that never reached the
  // server (closed tab, dropped network). Once the last one lands, re-render
  // with the saved progress.
  const outbox = useClientOutbox()
  const syncing = useSyncExternalStore(
    outbox.subscribe,
    () => hasPendingGrammarSessions(outbox.pendingItems()),
    () => false
  )
  const wasSyncingRef = useRef(syncing)

  useEffect(() => {
    if (wasSyncingRef.current && !syncing) router.refresh()

    wasSyncingRef.current = syncing
  }, [router, syncing])

  // Index click: unfold the unit (and drop a level filter hiding it), then
  // scroll once the panel is in the DOM.
  const jumpTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (jumpTimer.current !== null) cancelAnimationFrame(jumpTimer.current)
    },
    []
  )

  function setUnitOpen(unitId: string, open: boolean) {
    setOpenIds(current => {
      const next = new Set(current)

      if (open) next.add(unitId)
      else next.delete(unitId)

      return next
    })
  }

  function jumpToUnit(unitId: string) {
    const unit = path.units.find(item => item.id === unitId)

    if (unit && level !== 'all' && unit.level !== level) setLevel('all')
    setUnitOpen(unitId, true)
    if (jumpTimer.current !== null) cancelAnimationFrame(jumpTimer.current)
    jumpTimer.current = requestAnimationFrame(() => {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      document.getElementById(`unit-${unitId}`)?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const lesson = selected?.lesson

  return (
    <div className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
      <PageHeader
        actions={
          <dl className="flex gap-2">
            {[
              {
                label: 'Stars',
                value: `${path.totals.stars}/${path.totals.maxStars}`,
              },
              {
                label: 'Lessons done',
                value: `${path.totals.passedLessons}/${path.totals.totalLessons}`,
              },
            ].map(item => (
              <div
                className="border-line bg-surface grid min-w-24 gap-0.5 rounded-2xl border px-3 py-1.5"
                key={item.label}
              >
                <dt className="text-ink-soft text-[11px]">{item.label}</dt>
                <dd className="font-sans text-lg leading-tight font-medium tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        }
        icon={<PenLine />}
        iconClassName="bg-pastel-lilac text-accent-purple"
        subtitle={`${path.totals.totalLessons} short lessons from A1 to C1, about 5 minutes each.`}
        title="Grammar path"
      />

      {/* Continue card: where the learner is, one big action, and the two
          side doors (review due, weak spots). */}
      <section
        aria-label="Continue"
        className="bg-pastel-lilac rounded-panel grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch"
      >
        <div className="grid content-between gap-4">
          <div className="grid gap-2">
            {nextUnit ? (
              <span className="bg-surface/80 w-fit rounded-full px-3 py-1 text-xs font-medium">
                Unit {nextUnit.order} · {nextUnit.level} · {nextUnit.title}
              </span>
            ) : null}
            <h2 className="font-sans text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
              {nextLabel(path.next)}
            </h2>
            {nextSummary ? (
              <div className="flex max-w-md items-center gap-3">
                <div
                  aria-label={`${nextSummary.done} of ${nextSummary.total} lessons in this unit`}
                  className="bg-surface/80 h-2 flex-1 overflow-hidden rounded-full"
                  role="img"
                >
                  <div
                    className="bg-accent-purple motion-grow-x h-full rounded-full"
                    style={{ width: `${nextSummary.percent}%` }}
                  />
                </div>
                <span className="text-ink-soft text-xs tabular-nums">
                  {nextSummary.done}/{nextSummary.total}
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {href ? (
              <ActionButton
                className="w-full sm:w-auto"
                href={href}
                icon={
                  <Play
                    aria-hidden
                    className="fill-current"
                  />
                }
                tone="ink"
              >
                {path.next.kind === 'lesson' ? 'Start lesson' : 'Go'}
              </ActionButton>
            ) : null}
            {syncing ? (
              <p
                aria-live="polite"
                className="text-ink-soft flex items-center gap-2 text-sm"
              >
                <Loader2
                  aria-hidden
                  className="size-4 motion-safe:animate-spin"
                />
                Saving your last lesson...
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            {
              count: path.totals.dueCount,
              href: dueLesson
                ? `/grammar/lessons/${dueLesson.id}/review`
                : null,
              icon: RotateCcw,
              label: 'Review due',
              tone: 'text-brand-ink',
            },
            {
              count: path.totals.weakCount,
              href: path.totals.weakCount > 0 ? '/grammar/practice' : null,
              icon: Dumbbell,
              label: 'Weak spots',
              tone: 'text-accent-orange',
            },
          ].map(item => {
            const Icon = item.icon
            const body = (
              <>
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'bg-surface grid size-9 place-items-center rounded-full',
                      item.tone
                    )}
                  >
                    <Icon
                      aria-hidden
                      className="size-4"
                    />
                  </span>
                  <strong className="font-sans text-2xl leading-none font-medium tabular-nums">
                    {item.count}
                  </strong>
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </>
            )

            return item.href ? (
              <Link
                className="soft-press hover-lift bg-surface/70 hover:bg-surface rounded-control grid content-between gap-3 p-3"
                href={item.href}
                key={item.label}
              >
                {body}
              </Link>
            ) : (
              <div
                className="bg-surface/40 text-ink-soft rounded-control grid content-between gap-3 p-3"
                key={item.label}
              >
                {body}
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <UnitIndex
          currentUnitId={path.currentUnitId}
          onJump={jumpToUnit}
          summaries={summaries}
        />

        <div className="grid min-w-0 content-start gap-3">
          {levels.length > 1 ? (
            <div
              aria-label="Level"
              className="flex flex-wrap gap-2"
              role="group"
            >
              {(['all', ...levels] as const).map(value => (
                // Segmented filter (aria-pressed): documented raw-button
                // exception.
                <button
                  aria-pressed={level === value}
                  className={cn(
                    'soft-press min-h-9 rounded-full border px-3.5 text-sm font-medium',
                    level === value
                      ? 'border-cta bg-cta text-cta-fg'
                      : 'border-line bg-surface hover:bg-tint-soft'
                  )}
                  key={value}
                  onClick={() => setLevel(value)}
                  type="button"
                >
                  {value === 'all' ? 'All' : value}
                </button>
              ))}
            </div>
          ) : null}

          <div className="motion-stagger grid gap-3">
            {visibleUnits.map(unit => (
              <UnitCard
                isCurrent={unit.id === path.currentUnitId}
                key={unit.id}
                onOpenChange={open => setUnitOpen(unit.id, open)}
                onSelectLesson={item => setSelected({ lesson: item, unit })}
                open={openIds.has(unit.id)}
                unit={unit}
              />
            ))}
          </div>
        </div>
      </div>

      <Dialog
        onOpenChange={open => {
          if (!open) setSelected(null)
        }}
        open={selected !== null}
      >
        <DialogContent className="border-line bg-surface border">
          {lesson && selected ? (
            <>
              <DialogHeader>
                <PageTag
                  className="w-fit"
                  tone="pale"
                >
                  Unit {selected.unit.order} · {NODE_STATE_LABEL[lesson.state]}
                </PageTag>
                <DialogTitle className="font-sans text-xl font-medium">
                  {lesson.title}
                </DialogTitle>
                <DialogDescription>{lesson.summary}</DialogDescription>
              </DialogHeader>
              {lesson.state === 'locked' ? (
                <p className="text-ink-soft text-sm">
                  Finish the previous lesson to unlock this one
                  {selected.unit.state === 'locked'
                    ? ', or take the unit test-out.'
                    : '.'}
                </p>
              ) : (
                <div className="grid gap-2">
                  {lesson.state !== 'open' && !lesson.passedByTest ? (
                    <StarsInline stars={lesson.stars} />
                  ) : null}
                  {lesson.state === 'due' ? (
                    <ActionButton
                      href={`/grammar/lessons/${lesson.id}/review`}
                      icon={<RotateCcw aria-hidden />}
                      tone="ink"
                    >
                      Review (about 2 minutes)
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    href={`/grammar/lessons/${lesson.id}`}
                    icon={
                      <Play
                        aria-hidden
                        className="fill-current"
                      />
                    }
                    tone={lesson.state === 'open' ? 'ink' : 'paper'}
                  >
                    {lesson.state === 'open'
                      ? 'Start lesson'
                      : lesson.stars < 3
                        ? 'Redo for 3 stars'
                        : 'Redo lesson'}
                  </ActionButton>
                  {lesson.state !== 'open' ? (
                    <ActionButton
                      href={`/grammar/lessons/${lesson.id}/notes`}
                      icon={<BookOpen aria-hidden />}
                      tone="paper"
                    >
                      Open notes
                    </ActionButton>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

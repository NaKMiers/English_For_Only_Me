'use client'

import {
  ArrowDown,
  ArrowUp,
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
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react'

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
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import type {
  GrammarPathView,
  PathLesson,
  PathNext,
  PathUnit,
} from '@/modules/grammar/path/buildGrammarPath'
import {
  firstDueLesson,
  initialOpenUnitIds,
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

function nextLabel(t: Messages['grammar']['path']['next'], next: PathNext) {
  switch (next.kind) {
    case 'lesson':
      return format(t.lesson, { title: next.title })
    case 'checkpoint':
      return format(t.checkpoint, { title: next.title })
    case 'review':
      return format(t.review, { title: next.title })
    case 'weak':
      return plural(t.weak, next.count)
    case 'done':
      return t.done
  }
}

function StarsInline({ stars }: { stars: number }) {
  const t = useMessages()

  return (
    <span
      aria-label={format(t.grammar.stars, { stars })}
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

/**
 * Each unit wears one module-safe pastel (pink is the brand, so it is only
 * used for the current lesson). `--node` is the solid colour of a finished
 * lesson; the 3D ledge under every node is the same colour mixed darker.
 */
const UNIT_TONES = [
  { banner: 'bg-pastel-lilac', node: 'var(--accent-purple)' },
  { banner: 'bg-pastel-sky', node: 'var(--accent-blue)' },
  { banner: 'bg-pastel-mint', node: 'var(--accent-green)' },
  { banner: 'bg-pastel-peach', node: 'var(--accent-orange)' },
] as const

function unitTone(unit: PathUnit) {
  return UNIT_TONES[(unit.order - 1) % UNIT_TONES.length]
}

/** Horizontal offsets (px) for the winding path, repeated down the unit. */
const ZIGZAG = [0, 44, 72, 44, 0, -44, -72, -44]

function zigzagOffset(index: number) {
  return ZIGZAG[index % ZIGZAG.length]
}

/** DOM id of the node a "continue" action points at, for jumping to it. */
function nextNodeId(next: PathNext) {
  if (next.kind === 'lesson' || next.kind === 'review')
    return `node-${next.lessonId}`
  if (next.kind === 'checkpoint') return `node-checkpoint-${next.unitId}`

  return null
}

const NODE_BASE =
  'relative grid place-items-center rounded-full transition-[translate,box-shadow] duration-100 active:translate-y-[5px] active:shadow-none motion-reduce:active:translate-y-0'

function nodeLedge(color: string): CSSProperties {
  return {
    background: color,
    boxShadow: `0 6px 0 color-mix(in srgb, ${color} 62%, #000)`,
  }
}

/** One lesson as a round 3D button on the winding path. */
function PathNode({
  index,
  lesson,
  onSelect,
  toneColor,
}: {
  index: number
  lesson: PathLesson
  onSelect: () => void
  toneColor: string
}) {
  const t = useMessages().grammar.path
  const isOpen = lesson.state === 'open'
  const done = lesson.state !== 'open' && lesson.state !== 'locked'
  const color =
    lesson.state === 'open'
      ? 'var(--brand)'
      : lesson.state === 'locked'
        ? 'var(--line-strong)'
        : lesson.state === 'mastered'
          ? 'var(--accent-orange)'
          : lesson.state === 'due'
            ? 'var(--brand-soft)'
            : toneColor
  const Icon =
    lesson.state === 'open'
      ? Play
      : lesson.state === 'locked'
        ? Lock
        : lesson.state === 'mastered'
          ? Crown
          : lesson.state === 'due'
            ? RotateCcw
            : Check

  return (
    <li
      className={cn(
        'relative flex flex-col items-center gap-2.5',
        isOpen && 'pt-9'
      )}
      style={{ transform: `translateX(${zigzagOffset(index)}px)` }}
    >
      {isOpen ? (
        <span className="bg-surface text-brand-ink border-line absolute top-0 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-sm motion-safe:animate-bounce">
          {t.start}
        </span>
      ) : null}
      {/* Raw button: a round path node, not a labelled action button. */}
      <button
        aria-label={format(t.nodeLabel, {
          state: t.states[lesson.state],
          title: lesson.title,
        })}
        className={cn(
          NODE_BASE,
          isOpen ? 'size-[76px]' : 'size-16',
          lesson.state === 'locked' ? 'text-ink-soft' : 'text-surface',
          lesson.state === 'due' && 'text-brand-ink'
        )}
        id={`node-${lesson.id}`}
        onClick={onSelect}
        style={nodeLedge(color)}
        type="button"
      >
        {isOpen ? (
          <span
            aria-hidden
            className="ring-brand/30 pointer-events-none absolute -inset-2 rounded-full ring-4 motion-safe:animate-pulse"
          />
        ) : null}
        <Icon
          aria-hidden
          className={cn(
            isOpen ? 'size-8 fill-current' : 'size-7',
            (lesson.state === 'passed' || lesson.state === 'due') &&
              'stroke-[3]'
          )}
        />
      </button>
      {done ? (
        lesson.passedByTest ? (
          <span className="text-ink-soft text-[11px]">{t.testedOut}</span>
        ) : (
          <StarsInline stars={lesson.stars} />
        )
      ) : null}
      <span
        className={cn(
          'max-w-36 text-center text-xs leading-tight font-medium',
          lesson.state === 'locked' && 'text-ink-soft'
        )}
      >
        <span className="text-ink-soft block text-[10px] font-normal">
          {format(t.lesson, { number: index + 1 })}
        </span>
        {lesson.title}
      </span>
    </li>
  )
}

/** The unit's checkpoint as the last, larger node on the path. */
function CheckpointNode({ index, unit }: { index: number; unit: PathUnit }) {
  const t = useMessages().grammar.path
  const locked = unit.checkpoint === 'locked'
  const passed = unit.checkpoint === 'passed'

  return (
    <li
      className="flex flex-col items-center gap-2.5 pt-2"
      style={{ transform: `translateX(${zigzagOffset(index)}px)` }}
    >
      <Link
        aria-disabled={locked}
        aria-label={passed ? t.checkpointPassed : t.checkpoint}
        className={cn(
          NODE_BASE,
          'size-[72px]',
          locked ? 'text-ink-soft pointer-events-none' : 'text-surface'
        )}
        href={`/grammar/units/${unit.id}/checkpoint`}
        id={`node-checkpoint-${unit.id}`}
        style={nodeLedge(
          locked
            ? 'var(--line-strong)'
            : passed
              ? 'var(--accent-green)'
              : 'var(--accent-orange)'
        )}
        tabIndex={locked ? -1 : undefined}
      >
        {passed ? (
          <Check
            aria-hidden
            className="size-8 stroke-[3]"
          />
        ) : (
          <Trophy
            aria-hidden
            className="size-8"
          />
        )}
      </Link>
      <span className={cn('text-xs font-medium', locked && 'text-ink-soft')}>
        {passed ? t.checkpointPassed : t.checkpoint}
      </span>
    </li>
  )
}

/**
 * One unit: a sticky banner that folds the unit, then its winding path of
 * lessons ending in the checkpoint. Only the current unit starts unfolded,
 * so the page never turns into one endless scroll.
 */
function UnitTrail({
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
  const messages = useMessages()
  const t = messages.grammar.path
  const summary = summarizeUnit(unit)
  const tone = unitTone(unit)
  const complete = summary.state === 'complete'

  return (
    <Collapsible
      onOpenChange={onOpenChange}
      open={open}
      render={
        <section
          aria-labelledby={`unit-${unit.id}-title`}
          className="grid scroll-mt-4 gap-2"
          id={`unit-${unit.id}`}
        />
      }
    >
      {/* The heading wraps the trigger (accordion pattern). The banner sticks
          while its lessons scroll under it, like a chapter heading. */}
      <h2 className="sticky top-2 z-20 font-normal">
        <CollapsibleTrigger
          className={cn(
            'group/unit soft-press flex w-full items-center gap-3 rounded-3xl p-3 text-left shadow-sm sm:gap-4 sm:p-4',
            tone.banner,
            isCurrent && 'ring-brand/40 ring-2'
          )}
        >
          <ProgressRing
            className="bg-surface/70 rounded-full"
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
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="text-ink-soft flex flex-wrap items-center gap-x-2 text-xs">
              <span>
                {format(messages.grammar.unitLevel, {
                  level: unit.level,
                  order: unit.order,
                })}
              </span>
              {isCurrent ? (
                <span className="bg-surface text-brand-ink rounded-full px-2 py-0.5 font-medium">
                  {t.current}
                </span>
              ) : null}
              {summary.dueCount > 0 ? (
                <span className="text-brand-ink flex items-center gap-1 font-medium">
                  <RotateCcw
                    aria-hidden
                    className="size-3"
                  />
                  {format(t.dueCount, { count: summary.dueCount })}
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
              {format(t.lessonsCount, {
                done: summary.done,
                total: summary.total,
              })}
            </span>
            <span className="flex items-center justify-end gap-1 tabular-nums">
              <Star
                aria-hidden
                className="fill-brand text-brand size-3"
              />
              {summary.stars}/{summary.maxStars}
            </span>
          </span>
          <span className="bg-surface/70 grid size-9 shrink-0 place-items-center rounded-full">
            <ChevronDown
              aria-hidden
              className="text-ink-soft size-5 transition-transform group-data-[panel-open]/unit:rotate-180"
            />
          </span>
        </CollapsibleTrigger>
      </h2>
      <CollapsiblePanel>
        <div className="grid gap-4 pt-3 pb-6">
          <p className="text-ink-soft mx-auto max-w-md text-center text-sm">
            {unit.summary}
          </p>
          {unit.state === 'locked' ? (
            <ActionButton
              className="w-fit justify-self-center"
              href={`/grammar/units/${unit.id}/checkpoint`}
              icon={<Trophy aria-hidden />}
              tone="paper"
            >
              {t.testOut}
            </ActionButton>
          ) : null}
          <ol className="flex flex-col items-center gap-6">
            {unit.lessons.map((lesson, index) => (
              <PathNode
                index={index}
                key={lesson.id}
                lesson={lesson}
                onSelect={() => onSelectLesson(lesson)}
                toneColor={tone.node}
              />
            ))}
            <CheckpointNode
              index={unit.lessons.length}
              unit={unit}
            />
          </ol>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  )
}

function UnitIndex({
  currentUnitId,
  onJump,
  summaries,
}: {
  currentUnitId: string | null
  onJump: (unitId: string) => void
  summaries: UnitSummary[]
}) {
  const t = useMessages().grammar.path

  return (
    <nav
      aria-label={t.units}
      className="min-w-0 lg:sticky lg:top-6 lg:self-start"
    >
      <h2 className="text-ink-soft mb-2 hidden px-1 text-xs font-medium lg:block">
        {t.units}
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
  const messages = useMessages()
  const t = messages.grammar.path
  const router = useRouter()
  const [selected, setSelected] = useState<{
    lesson: PathLesson
    unit: PathUnit
  } | null>(null)
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(initialOpenUnitIds(path))
  )
  // A refresh (a replayed session landing) can move the learner to a new
  // unit: unfold it too, keeping whatever they opened themselves.
  const [openedFor, setOpenedFor] = useState(path.currentUnitId)

  if (openedFor !== path.currentUnitId) {
    setOpenedFor(path.currentUnitId)
    setOpenIds(current => new Set([...current, ...initialOpenUnitIds(path)]))
  }
  const href = nextHref(path.next)
  const summaries = path.units.map(summarizeUnit)
  const nextUnit = unitOfNext(path)
  const nextSummary = nextUnit ? summarizeUnit(nextUnit) : null
  const dueLesson = firstDueLesson(path.units)
  const targetNodeId = nextNodeId(path.next)

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

  // Floating "back to my lesson" button: shown while the next node is folded
  // away or scrolled out of view, pointing the way to it. Measured on scroll,
  // resize and fold changes (an IntersectionObserver misreads a node while
  // its panel is still animating open).
  const [targetDirection, setTargetDirection] = useState<'up' | 'down' | null>(
    null
  )
  const nextUnitId = nextUnit?.id ?? null
  const targetUnitOpen = nextUnitId ? openIds.has(nextUnitId) : false

  useEffect(() => {
    if (!targetNodeId) return

    let frame: number | null = null

    function measure() {
      frame = null
      const node = targetUnitOpen
        ? document.getElementById(targetNodeId ?? '')
        : null
      const anchor =
        node ??
        (nextUnitId ? document.getElementById(`unit-${nextUnitId}`) : null)

      if (!anchor) {
        setTargetDirection(null)
        return
      }

      const rect = anchor.getBoundingClientRect()
      const visible =
        node !== null &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight

      setTargetDirection(visible ? null : rect.top < 0 ? 'up' : 'down')
    }

    function schedule() {
      if (frame === null) frame = requestAnimationFrame(measure)
    }

    schedule()
    // Once more after the fold animation settles.
    const settle = window.setTimeout(schedule, 450)

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)

    return () => {
      window.clearTimeout(settle)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame !== null) cancelAnimationFrame(frame)
    }
  }, [nextUnitId, targetNodeId, targetUnitOpen])

  // Index click: unfold the unit, then scroll once the panel is in the DOM.
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

  function scrollToElement(id: string, block: ScrollLogicalPosition) {
    if (jumpTimer.current !== null) cancelAnimationFrame(jumpTimer.current)
    jumpTimer.current = requestAnimationFrame(() => {
      const reduce = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches

      document.getElementById(id)?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block,
      })
    })
  }

  function jumpToUnit(unitId: string) {
    setUnitOpen(unitId, true)
    scrollToElement(`unit-${unitId}`, 'start')
  }

  function jumpToTarget() {
    if (!targetNodeId) return
    if (nextUnit) setUnitOpen(nextUnit.id, true)
    scrollToElement(targetNodeId, 'center')
  }

  const lesson = selected?.lesson

  return (
    <div className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
      <PageHeader
        actions={
          <dl className="flex gap-2">
            {[
              {
                label: t.statStars,
                value: `${path.totals.stars}/${path.totals.maxStars}`,
              },
              {
                label: t.statLessons,
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
        subtitle={format(t.introShort, { count: path.totals.totalLessons })}
        title={t.title}
      />

      {/* Continue card: where the learner is, one big action, and the two
          side doors (review due, weak spots). */}
      <section
        aria-label={t.continue}
        className="bg-pastel-lilac rounded-panel grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch"
      >
        <div className="grid content-between gap-4">
          <div className="grid gap-2">
            {nextUnit ? (
              <span className="bg-surface/80 w-fit rounded-full px-3 py-1 text-xs font-medium">
                {format(messages.grammar.unitLevel, {
                  level: nextUnit.level,
                  order: nextUnit.order,
                })}{' '}
                · {nextUnit.title}
              </span>
            ) : null}
            <h2 className="font-sans text-2xl leading-tight font-medium tracking-tight sm:text-3xl">
              {nextLabel(t.next, path.next)}
            </h2>
            {nextSummary ? (
              <div className="flex max-w-md items-center gap-3">
                <div
                  aria-label={format(t.unitProgress, {
                    done: nextSummary.done,
                    total: nextSummary.total,
                  })}
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
                {path.next.kind === 'lesson' ? t.startLesson : t.go}
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
                {t.syncing}
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
              label: t.reviewDue,
              tone: 'text-brand-ink',
            },
            {
              count: path.totals.weakCount,
              href: path.totals.weakCount > 0 ? '/grammar/practice' : null,
              icon: Dumbbell,
              label: t.weakSpotsLabel,
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

        <div className="grid min-w-0 content-start gap-4 lg:mx-auto lg:w-full lg:max-w-2xl">
          {path.units.map(unit => (
            <UnitTrail
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

      {targetDirection && targetNodeId ? (
        <button
          className="soft-press bg-cta text-cta-fg hover:shadow-float motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 fixed right-4 bottom-[calc(max(12px,env(safe-area-inset-bottom))+5rem)] z-30 flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium shadow-lg md:right-8 md:bottom-8"
          onClick={jumpToTarget}
          type="button"
        >
          {targetDirection === 'up' ? (
            <ArrowUp
              aria-hidden
              className="size-4"
            />
          ) : (
            <ArrowDown
              aria-hidden
              className="size-4"
            />
          )}
          {t.jumpToCurrent}
        </button>
      ) : null}

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
                  {format(t.unitState, {
                    order: selected.unit.order,
                    state: t.states[lesson.state],
                  })}
                </PageTag>
                <DialogTitle className="font-sans text-xl font-medium">
                  {lesson.title}
                </DialogTitle>
                <DialogDescription>{lesson.summary}</DialogDescription>
              </DialogHeader>
              {lesson.state === 'locked' ? (
                <p className="text-ink-soft text-sm">
                  {selected.unit.state === 'locked'
                    ? t.lockedHintTestOut
                    : t.lockedHint}
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
                      {t.review}
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
                      ? t.startLesson
                      : lesson.stars < 3
                        ? messages.grammar.redoForStars
                        : t.redoLesson}
                  </ActionButton>
                  {lesson.state !== 'open' ? (
                    <ActionButton
                      href={`/grammar/lessons/${lesson.id}/notes`}
                      icon={<BookOpen aria-hidden />}
                      tone="paper"
                    >
                      {t.openNotes}
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

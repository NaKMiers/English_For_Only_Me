'use client'

import {
  BookOpen,
  Check,
  Crown,
  Dumbbell,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Star,
  Trophy,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type {
  GrammarPathView,
  PathLesson,
  PathNext,
  PathUnit,
} from '@/modules/grammar/path/buildGrammarPath'
import { hasPendingGrammarSessions } from '@/requests/grammarSessionsApi'

interface Props {
  path: GrammarPathView
}

// A gentle zigzag: nodes sway left and right so the path reads as a road.
const NODE_OFFSETS = [0, 44, 64, 44, 0, -44, -64, -44]

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
            'size-3.5 stroke-[2.5]',
            index <= stars
              ? 'fill-brand text-ink'
              : 'text-ink-soft fill-transparent'
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

function LessonNode({
  lesson,
  offset,
  onSelect,
}: {
  lesson: PathLesson
  offset: number
  onSelect: () => void
}) {
  const isOpen = lesson.state === 'open'

  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-1',
        // Room for the "Start" bubble so it never sits on the label above.
        isOpen && 'mt-8'
      )}
      style={{ transform: `translateX(${offset}px)` }}
    >
      {isOpen ? (
        <span className="border-line bg-surface rounded-tag absolute -top-9 border px-2 py-0.5 text-xs font-semibold whitespace-nowrap motion-safe:animate-bounce">
          Start
        </span>
      ) : null}
      {/* Raw button: a circular path node, not a labelled action button. */}
      <button
        aria-label={`${lesson.title}, ${NODE_STATE_LABEL[lesson.state]}`}
        className={cn(
          'border-line soft-press grid place-items-center rounded-full border',
          isOpen ? 'bg-brand text-surface size-20' : 'size-16',
          lesson.state === 'locked' &&
            'bg-surface text-ink-soft border-dashed shadow-none',
          lesson.state === 'passed' && 'bg-tint text-ink',
          lesson.state === 'mastered' && 'bg-ink text-surface',
          lesson.state === 'due' && 'bg-surface text-brand'
        )}
        onClick={onSelect}
        style={
          lesson.state === 'due'
            ? {
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--tint) 0 5px, transparent 5px 10px)',
              }
            : undefined
        }
        type="button"
      >
        {lesson.state === 'locked' ? (
          <Lock
            aria-hidden
            className="size-6"
          />
        ) : null}
        {isOpen ? (
          <Play
            aria-hidden
            className="size-8 fill-current"
          />
        ) : null}
        {lesson.state === 'passed' ? (
          <Check
            aria-hidden
            className="size-7 stroke-[3]"
          />
        ) : null}
        {lesson.state === 'mastered' ? (
          <Crown
            aria-hidden
            className="size-7"
          />
        ) : null}
        {lesson.state === 'due' ? (
          <RotateCcw
            aria-hidden
            className="size-7 stroke-[3]"
          />
        ) : null}
      </button>
      {lesson.state === 'passed' ||
      lesson.state === 'due' ||
      lesson.state === 'mastered' ? (
        lesson.passedByTest ? (
          <span className="text-ink-soft text-[11px] font-normal">
            Tested out
          </span>
        ) : (
          <StarsInline stars={lesson.stars} />
        )
      ) : null}
      <span className="max-w-32 text-center text-xs leading-tight font-bold">
        {lesson.title}
      </span>
    </div>
  )
}

function UnitSection({
  onSelectLesson,
  unit,
}: {
  onSelectLesson: (lesson: PathLesson, unit: PathUnit) => void
  unit: PathUnit
}) {
  const passedCount = unit.lessons.filter(
    lesson => lesson.state !== 'open' && lesson.state !== 'locked'
  ).length

  return (
    <section
      aria-labelledby={`unit-${unit.id}-title`}
      className="grid scroll-mt-24 gap-8"
      id={`unit-${unit.id}`}
    >
      <header
        className={cn(
          'border-line rounded-panel grid gap-2 border p-4',
          unit.state === 'locked' ? 'bg-surface' : 'bg-tint',
          unit.state === 'complete' && 'bg-ink text-surface'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PageTag tone="pale">
            Unit {unit.order} · {unit.level}
          </PageTag>
          <span className="text-xs font-semibold">
            {unit.state === 'complete'
              ? 'Completed'
              : `${passedCount}/${unit.lessons.length} lessons`}
          </span>
        </div>
        <h2
          className="font-sans text-xl leading-tight font-semibold sm:text-2xl"
          id={`unit-${unit.id}-title`}
        >
          {unit.title}
        </h2>
        <p
          className={cn(
            'text-sm',
            unit.state === 'complete' ? 'text-surface/80' : 'text-ink-soft'
          )}
        >
          {unit.summary}
        </p>
        {unit.state === 'locked' ? (
          <ActionButton
            className="mt-1 w-fit"
            href={`/grammar/units/${unit.id}/checkpoint`}
            icon={<Trophy aria-hidden />}
            tone="paper"
          >
            Test out
          </ActionButton>
        ) : null}
      </header>

      <div className="grid justify-items-center gap-7 pt-4">
        {unit.lessons.map((lesson, index) => (
          <LessonNode
            key={lesson.id}
            lesson={lesson}
            offset={NODE_OFFSETS[index % NODE_OFFSETS.length] ?? 0}
            onSelect={() => onSelectLesson(lesson, unit)}
          />
        ))}
        <ActionButton
          aria-disabled={unit.checkpoint === 'locked'}
          className={cn(
            'min-w-48',
            unit.checkpoint === 'locked' &&
              'pointer-events-none border-dashed opacity-55 shadow-none'
          )}
          href={`/grammar/units/${unit.id}/checkpoint`}
          icon={
            unit.checkpoint === 'passed' ? (
              <Check aria-hidden />
            ) : (
              <Trophy aria-hidden />
            )
          }
          tabIndex={unit.checkpoint === 'locked' ? -1 : undefined}
          tone={unit.checkpoint === 'open' ? 'ink' : 'paper'}
        >
          {unit.checkpoint === 'passed' ? 'Checkpoint passed' : 'Checkpoint'}
        </ActionButton>
      </div>
    </section>
  )
}

export function GrammarPath({ path }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<{
    lesson: PathLesson
    unit: PathUnit
  } | null>(null)
  const href = nextHref(path.next)

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

  // Land on the unit the learner is working on, not on unit 1. Keyed on ids
  // (strings), so a router.refresh() with the same unit does not yank the
  // page back while the learner is scrolling.
  const currentUnitId = path.currentUnitId
  const firstUnitId = path.units[0]?.id

  useEffect(() => {
    if (!currentUnitId || currentUnitId === firstUnitId) return

    document
      .getElementById(`unit-${currentUnitId}`)
      ?.scrollIntoView({ block: 'start' })
  }, [currentUnitId, firstUnitId])

  const lesson = selected?.lesson

  return (
    <div className="grid gap-6 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="page-hero grid gap-2">
          <PageTag tone="pale">Grammar</PageTag>
          <h1 className="font-sans text-4xl leading-none font-medium sm:text-5xl">
            Grammar path
          </h1>
          <p className="text-ink-soft max-w-xl text-sm sm:text-base">
            {path.totals.totalLessons} short lessons from A1 to C1, about 5
            minutes each. Finish one to unlock the next; finished lessons fade
            when they are due for review.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              label: 'Stars',
              value: `${path.totals.stars}/${path.totals.maxStars}`,
            },
            {
              label: 'Lessons done',
              value: `${path.totals.passedLessons}/${path.totals.totalLessons}`,
            },
            { label: 'Due', value: String(path.totals.dueCount) },
          ].map(item => (
            <div
              className="border-line bg-surface rounded-control grid min-w-24 gap-0.5 border px-3 py-2"
              key={item.label}
            >
              <dt className="text-ink-soft text-[11px] font-normal">
                {item.label}
              </dt>
              <dd className="font-sans text-xl font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="border-line bg-surface rounded-panel sticky top-2 z-10 grid gap-3 border p-3 sm:flex sm:flex-wrap sm:items-center">
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
            {nextLabel(path.next)}
          </ActionButton>
        ) : (
          <p className="font-sans font-semibold">{nextLabel(path.next)}</p>
        )}
        {path.totals.weakCount > 0 && path.next.kind !== 'weak' ? (
          <ActionButton
            href="/grammar/practice"
            icon={<Dumbbell aria-hidden />}
            tone="paper"
          >
            Weak spots ({path.totals.weakCount})
          </ActionButton>
        ) : null}
        {syncing ? (
          <p
            aria-live="polite"
            className="text-ink-soft flex items-center gap-2 text-sm font-bold"
          >
            <Loader2
              aria-hidden
              className="size-4 motion-safe:animate-spin"
            />
            Saving your last lesson...
          </p>
        ) : null}
      </div>

      <div className="motion-stagger mx-auto grid w-full max-w-xl gap-14 pb-10">
        {path.units.map(unit => (
          <UnitSection
            key={unit.id}
            onSelectLesson={(item, owner) =>
              setSelected({ lesson: item, unit: owner })
            }
            unit={unit}
          />
        ))}
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
                <DialogTitle className="font-sans text-xl font-semibold">
                  {lesson.title}
                </DialogTitle>
                <DialogDescription>{lesson.summary}</DialogDescription>
              </DialogHeader>
              {lesson.state === 'locked' ? (
                <p className="text-ink-soft text-sm font-bold">
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

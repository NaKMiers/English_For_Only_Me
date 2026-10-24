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
import { MangaButton } from '@/components/ui/MangaButton'
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
      return `Tiếp tục: ${next.title}`
    case 'checkpoint':
      return `Checkpoint: ${next.title}`
    case 'review':
      return `Ôn lại: ${next.title}`
    case 'weak':
      return `Luyện ${next.count} câu yếu`
    case 'done':
      return 'Bạn đã đi hết lộ trình'
  }
}

function StarsInline({ stars }: { stars: number }) {
  return (
    <span
      aria-label={`${stars} sao`}
      className="flex gap-0.5"
      role="img"
    >
      {[1, 2, 3].map(index => (
        <Star
          aria-hidden
          className={cn(
            'size-3.5 stroke-[2.5]',
            index <= stars
              ? 'fill-manga-red text-manga-black'
              : 'text-manga-ink-soft fill-transparent'
          )}
          key={index}
        />
      ))}
    </span>
  )
}

const NODE_STATE_LABEL: Record<PathLesson['state'], string> = {
  due: 'đến hạn ôn',
  locked: 'chưa mở',
  mastered: 'đã thuộc',
  open: 'đang mở',
  passed: 'đã học',
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
        // Room for the "Bắt đầu" bubble so it never sits on the label above.
        isOpen && 'mt-8'
      )}
      style={{ transform: `translateX(${offset}px)` }}
    >
      {isOpen ? (
        <span className="border-manga-black bg-manga-white rounded-tag absolute -top-9 border-2 px-2 py-0.5 text-xs font-black whitespace-nowrap shadow-[2px_2px_0_var(--manga-black)] motion-safe:animate-bounce">
          Bắt đầu
        </span>
      ) : null}
      {/* Raw button: a circular path node, not a labelled action button. */}
      <button
        aria-label={`${lesson.title}, ${NODE_STATE_LABEL[lesson.state]}`}
        className={cn(
          'border-manga-black sticker-press grid place-items-center rounded-full border-3 shadow-[4px_4px_0_var(--manga-black)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none',
          isOpen ? 'bg-manga-red text-manga-white size-20' : 'size-16',
          lesson.state === 'locked' &&
            'bg-manga-white text-manga-ink-soft border-dashed shadow-none',
          lesson.state === 'passed' && 'bg-manga-paper-soft text-manga-black',
          lesson.state === 'mastered' && 'bg-manga-black text-manga-white',
          lesson.state === 'due' && 'bg-manga-white text-manga-red'
        )}
        onClick={onSelect}
        style={
          lesson.state === 'due'
            ? {
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--manga-paper-soft) 0 5px, transparent 5px 10px)',
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
          <span className="text-manga-ink-soft text-[11px] font-black uppercase">
            Đã vượt
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
          'border-manga-black rounded-panel grid gap-2 border-3 p-4 shadow-[4px_4px_0_var(--manga-black)]',
          unit.state === 'locked' ? 'bg-manga-white' : 'bg-manga-paper-soft',
          unit.state === 'complete' && 'bg-manga-black text-manga-white'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <PageTag tone="pale">
            Unit {unit.order} · {unit.level}
          </PageTag>
          <span className="text-xs font-black uppercase">
            {unit.state === 'complete'
              ? 'Hoàn thành'
              : `${passedCount}/${unit.lessons.length} bài`}
          </span>
        </div>
        <h2
          className="font-sans text-xl leading-tight font-black sm:text-2xl"
          id={`unit-${unit.id}-title`}
        >
          {unit.title}
        </h2>
        <p
          className={cn(
            'text-sm',
            unit.state === 'complete'
              ? 'text-manga-white/80'
              : 'text-manga-ink-soft'
          )}
        >
          {unit.summary}
        </p>
        {unit.state === 'locked' ? (
          <MangaButton
            className="mt-1 w-fit"
            href={`/grammar/units/${unit.id}/checkpoint`}
            icon={<Trophy aria-hidden />}
            tone="paper"
          >
            Test vượt cấp
          </MangaButton>
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
        <MangaButton
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
          {unit.checkpoint === 'passed' ? 'Checkpoint đã qua' : 'Checkpoint'}
        </MangaButton>
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
          <PageTag tone="pale">Ngữ pháp</PageTag>
          <h1 className="font-sans text-4xl leading-none font-black uppercase sm:text-5xl">
            Lộ trình ngữ pháp
          </h1>
          <p className="text-manga-ink-soft max-w-xl text-sm sm:text-base">
            {path.totals.totalLessons} bài ngắn từ A1 đến C1, mỗi bài khoảng 5
            phút. Học để mở bài tiếp theo, bài đã học sẽ phai màu khi đến lúc
            ôn.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              label: 'Sao',
              value: `${path.totals.stars}/${path.totals.maxStars}`,
            },
            {
              label: 'Bài đã qua',
              value: `${path.totals.passedLessons}/${path.totals.totalLessons}`,
            },
            { label: 'Cần ôn', value: String(path.totals.dueCount) },
          ].map(item => (
            <div
              className="border-manga-black bg-manga-white rounded-control grid min-w-24 gap-0.5 border-3 px-3 py-2 shadow-[3px_3px_0_var(--manga-black)]"
              key={item.label}
            >
              <dt className="text-manga-ink-soft text-[11px] font-black uppercase">
                {item.label}
              </dt>
              <dd className="font-sans text-xl font-black">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="border-manga-black bg-manga-white rounded-panel sticky top-2 z-10 grid gap-3 border-3 p-3 shadow-[4px_4px_0_var(--manga-black)] sm:flex sm:flex-wrap sm:items-center">
        {href ? (
          <MangaButton
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
          </MangaButton>
        ) : (
          <p className="font-sans font-black">{nextLabel(path.next)}</p>
        )}
        {path.totals.weakCount > 0 && path.next.kind !== 'weak' ? (
          <MangaButton
            href="/grammar/practice"
            icon={<Dumbbell aria-hidden />}
            tone="paper"
          >
            Luyện điểm yếu ({path.totals.weakCount})
          </MangaButton>
        ) : null}
        {syncing ? (
          <p
            aria-live="polite"
            className="text-manga-ink-soft flex items-center gap-2 text-sm font-bold"
          >
            <Loader2
              aria-hidden
              className="size-4 motion-safe:animate-spin"
            />
            Đang lưu kết quả bài trước...
          </p>
        ) : null}
      </div>

      <div className="mx-auto grid w-full max-w-xl gap-14 pb-10">
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
        <DialogContent className="border-manga-black bg-manga-white border-3 shadow-[6px_6px_0_var(--manga-black)]">
          {lesson && selected ? (
            <>
              <DialogHeader>
                <PageTag
                  className="w-fit"
                  tone="pale"
                >
                  Unit {selected.unit.order} · {NODE_STATE_LABEL[lesson.state]}
                </PageTag>
                <DialogTitle className="font-sans text-xl font-black">
                  {lesson.title}
                </DialogTitle>
                <DialogDescription>{lesson.summary}</DialogDescription>
              </DialogHeader>
              {lesson.state === 'locked' ? (
                <p className="text-manga-ink-soft text-sm font-bold">
                  Hoàn thành bài trước để mở bài này
                  {selected.unit.state === 'locked'
                    ? ', hoặc làm Test vượt cấp của unit.'
                    : '.'}
                </p>
              ) : (
                <div className="grid gap-2">
                  {lesson.state !== 'open' && !lesson.passedByTest ? (
                    <StarsInline stars={lesson.stars} />
                  ) : null}
                  {lesson.state === 'due' ? (
                    <MangaButton
                      href={`/grammar/lessons/${lesson.id}/review`}
                      icon={<RotateCcw aria-hidden />}
                      tone="ink"
                    >
                      Ôn lại (khoảng 2 phút)
                    </MangaButton>
                  ) : null}
                  <MangaButton
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
                      ? 'Bắt đầu học'
                      : lesson.stars < 3
                        ? 'Học lại để lấy 3 sao'
                        : 'Học lại'}
                  </MangaButton>
                  {lesson.state !== 'open' ? (
                    <MangaButton
                      href={`/grammar/lessons/${lesson.id}/notes`}
                      icon={<BookOpen aria-hidden />}
                      tone="paper"
                    >
                      Xem ghi chú
                    </MangaButton>
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

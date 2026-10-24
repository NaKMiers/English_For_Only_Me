import type { CourseLookup } from '@/modules/grammar/course/courseLookup'
import type { CefrLevel, GrammarUnit } from '@/modules/grammar/course/types'
import {
  isLessonPassed,
  type CardMiss,
  type LessonProgress,
  type UnitProgress,
} from '@/modules/grammar/progress/types'

/**
 * The whole path page as one pure function of (course, progress, now).
 *
 * Every state the page shows is derived here and nowhere else, so there is a
 * single table of tests for it (see buildGrammarPath.test.ts).
 *
 *   unit:   locked ──prev unit complete──▶ active ──checkpoint/test pass──▶ complete
 *   lesson: locked ──prev lesson passed──▶ open ──finish──▶ passed ──dueAt<=now──▶ due
 *                                                             ▲                  │
 *                                                             └──review pass─────┘
 *                                           passed at stage 7 ──▶ mastered (never due)
 *
 * A lesson passed by a test-out sits at `passed` with no ladder until it is
 * played as a lesson.
 */

export type LessonNodeState = 'locked' | 'open' | 'passed' | 'due' | 'mastered'
export type UnitNodeState = 'locked' | 'active' | 'complete'
export type CheckpointState = 'locked' | 'open' | 'passed'

export interface PathLesson {
  id: string
  title: string
  summary: string
  state: LessonNodeState
  stars: number
  passedByTest: boolean
  /** ISO date when the lesson is due for review, if it is on the ladder. */
  dueAt: string | null
}

export interface PathUnit {
  id: string
  order: number
  level: CefrLevel
  title: string
  summary: string
  state: UnitNodeState
  checkpoint: CheckpointState
  lessons: PathLesson[]
}

export type PathNext =
  | { kind: 'lesson'; lessonId: string; title: string }
  | { kind: 'checkpoint'; unitId: string; title: string }
  | { kind: 'review'; lessonId: string; title: string }
  | { kind: 'weak'; count: number }
  | { kind: 'done' }

export interface GrammarPathView {
  units: PathUnit[]
  next: PathNext
  currentUnitId: string | null
  totals: {
    stars: number
    maxStars: number
    passedLessons: number
    totalLessons: number
    dueCount: number
    weakCount: number
  }
}

export interface BuildGrammarPathInput {
  course: CourseLookup
  lessonProgress: LessonProgress[]
  unitProgress: UnitProgress[]
  misses: CardMiss[]
  now: Date
}

function lessonState(
  progress: LessonProgress | undefined,
  unlocked: boolean,
  now: Date
): LessonNodeState {
  if (!isLessonPassed(progress)) return unlocked ? 'open' : 'locked'
  if (progress?.masteredAt) return 'mastered'
  if (
    progress?.recallStage !== null &&
    progress?.dueAt &&
    progress.dueAt.getTime() <= now.getTime()
  )
    return 'due'

  return 'passed'
}

function indexProgress(course: CourseLookup, rows: LessonProgress[]) {
  const byLesson = new Map<string, LessonProgress>()

  for (const row of rows) {
    const lessonId = course.resolveId(row.lessonId)

    if (course.getLesson(lessonId)) byLesson.set(lessonId, { ...row, lessonId })
  }

  return byLesson
}

/** Open misses whose card still exists in the course. */
export function countOpenMisses(course: CourseLookup, misses: CardMiss[]) {
  const open = new Set<string>()

  for (const miss of misses) {
    if (miss.clearedAt) continue

    const location = course.getCard(miss.cardId)

    if (location && location.card.kind !== 'explain') open.add(location.card.id)
  }

  return open.size
}

export function isUnitOpen(
  units: GrammarUnit[],
  index: number,
  completed: Set<string>
) {
  if (index === 0) return true

  const previous = units[index - 1]

  return previous ? completed.has(previous.id) : false
}

/** True when the learner may start `lessonId` as a lesson right now. */
export function isLessonUnlocked(
  input: Pick<
    BuildGrammarPathInput,
    'course' | 'lessonProgress' | 'unitProgress'
  >,
  lessonId: string
) {
  const { course } = input
  const target = course.getLesson(lessonId)

  if (!target) return false

  const progress = indexProgress(course, input.lessonProgress)

  if (isLessonPassed(progress.get(target.lesson.id))) return true

  const completed = new Set(input.unitProgress.map(row => row.unitId))
  const unitIndex = course.units.findIndex(unit => unit.id === target.unit.id)

  if (!isUnitOpen(course.units, unitIndex, completed)) return false

  const lessonIndex = target.unit.lessons.findIndex(
    lesson => lesson.id === target.lesson.id
  )
  const previous = target.unit.lessons[lessonIndex - 1]

  return !previous || isLessonPassed(progress.get(previous.id))
}

export function buildGrammarPath({
  course,
  lessonProgress,
  misses,
  now,
  unitProgress,
}: BuildGrammarPathInput): GrammarPathView {
  const progress = indexProgress(course, lessonProgress)
  const completed = new Set(
    unitProgress
      .map(row => row.unitId)
      .filter(unitId => course.getUnit(unitId) !== null)
  )

  let stars = 0
  let passedLessons = 0
  let totalLessons = 0
  let dueCount = 0
  let firstOpen: PathNext | null = null
  let firstCheckpoint: PathNext | null = null
  let mostOverdue: { lessonId: string; title: string; dueAt: number } | null =
    null
  let currentUnitId: string | null = null
  const units: PathUnit[] = []

  for (const [unitIndex, unit] of course.units.entries()) {
    const unitOpen = isUnitOpen(course.units, unitIndex, completed)
    const lessons: PathLesson[] = []
    let previousPassed = true

    for (const lesson of unit.lessons) {
      const row = progress.get(lesson.id)
      const passed = isLessonPassed(row)
      const state = lessonState(
        row,
        passed || (unitOpen && previousPassed),
        now
      )

      previousPassed = passed
      totalLessons += 1
      stars += row?.stars ?? 0

      if (passed) passedLessons += 1

      if (state === 'open' && !firstOpen) {
        firstOpen = { kind: 'lesson', lessonId: lesson.id, title: lesson.title }
        currentUnitId ??= unit.id
      }

      if (state === 'due' && row?.dueAt) {
        dueCount += 1

        if (!mostOverdue || row.dueAt.getTime() < mostOverdue.dueAt)
          mostOverdue = {
            dueAt: row.dueAt.getTime(),
            lessonId: lesson.id,
            title: lesson.title,
          }
      }

      lessons.push({
        dueAt: row?.dueAt?.toISOString() ?? null,
        id: lesson.id,
        passedByTest: row?.passedBy === 'test' && (row.stars ?? 0) === 0,
        stars: row?.stars ?? 0,
        state,
        summary: lesson.summary,
        title: lesson.title,
      })
    }

    const isComplete = completed.has(unit.id)
    const allPassed = lessons.every(
      lesson => lesson.state !== 'open' && lesson.state !== 'locked'
    )
    let checkpoint: CheckpointState = 'locked'

    if (isComplete) checkpoint = 'passed'
    else if (unitOpen && allPassed) checkpoint = 'open'

    if (checkpoint === 'open' && !firstCheckpoint) {
      firstCheckpoint = {
        kind: 'checkpoint',
        title: unit.title,
        unitId: unit.id,
      }
      currentUnitId ??= unit.id
    }

    let state: UnitNodeState = 'locked'

    if (isComplete) state = 'complete'
    else if (unitOpen) state = 'active'

    units.push({
      checkpoint,
      id: unit.id,
      lessons,
      level: unit.level,
      order: unit.order,
      state,
      summary: unit.summary,
      title: unit.title,
    })
  }

  const weakCount = countOpenMisses(course, misses)
  let next: PathNext = { kind: 'done' }

  if (firstOpen) next = firstOpen
  else if (firstCheckpoint) next = firstCheckpoint
  else if (mostOverdue)
    next = {
      kind: 'review',
      lessonId: mostOverdue.lessonId,
      title: mostOverdue.title,
    }
  else if (weakCount > 0) next = { count: weakCount, kind: 'weak' }

  return {
    currentUnitId:
      currentUnitId ??
      units.findLast(unit => unit.state !== 'locked')?.id ??
      null,
    next,
    totals: {
      dueCount,
      maxStars: totalLessons * 3,
      passedLessons,
      stars,
      totalLessons,
      weakCount,
    },
    units,
  }
}

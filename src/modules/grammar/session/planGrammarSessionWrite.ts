import {
  CHECKPOINT_SIZE,
  PASS_ACCURACY,
  REVIEW_MAX_SIZE,
  REVIEW_MIN_SIZE,
  WEAK_MAX_SIZE,
  type GrammarSessionMode,
} from '@/modules/grammar/constants'
import type { CourseLookup } from '@/modules/grammar/course/courseLookup'
import type {
  GrammarLesson,
  GrammarUnit,
  PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard, parseCardAnswer } from '@/modules/grammar/grading/gradeCard'
import {
  isLessonUnlocked,
  isUnitOpen,
} from '@/modules/grammar/path/buildGrammarPath'
import {
  emptyLessonProgress,
  isLessonPassed,
  type CardMiss,
  type LessonProgress,
  type UnitProgress,
} from '@/modules/grammar/progress/types'
import { applyRecallAnswer } from '@/modules/learning/recall/recallLadder'

import { starsForAccuracy } from './scoring'

/**
 * Turn one finished session into the exact rows to write, as a pure function.
 *
 *   submission ──▶ validate shape ──▶ resolve cards ──▶ mode rules (400/409)
 *                                                          │
 *                       re-grade every raw answer ◀────────┘
 *                                │
 *        lesson     : stars (max), first completion enters the ladder (+1 day)
 *        review     : one ladder answer, pass = accuracy >= 80%
 *        checkpoint : pass completes the unit; a test-out also passes every
 *                     earlier lesson and unit (no stars, no ladder, no misses)
 *        weak       : correct clears the miss, wrong bumps it
 *                                │
 *                                ▼
 *        { lessonWrites, unitWrites, missWrites, response }
 *
 * The Mongo service only upserts what this returns, so every rule above is
 * covered by table tests without a database.
 */

export interface SessionAnswerInput {
  cardId: string
  answer: unknown
}

export interface GrammarSessionSubmission {
  mode: GrammarSessionMode
  targetId: string
  answers: SessionAnswerInput[]
}

export interface ActorGrammarProgress {
  lessonProgress: LessonProgress[]
  unitProgress: UnitProgress[]
  misses: CardMiss[]
}

export type SessionUnlock =
  | { kind: 'lesson'; lessonId: string; title: string }
  | { kind: 'checkpoint'; unitId: string; title: string }
  | { kind: 'unit'; unitId: string; title: string }

export interface SessionCardResult {
  cardId: string
  correct: boolean
  expected: string
}

export interface GrammarSessionResult {
  mode: GrammarSessionMode
  targetId: string
  total: number
  correctCount: number
  accuracy: number
  passed: boolean
  stars: number | null
  results: SessionCardResult[]
  unlocked: SessionUnlock | null
  /** True when a checkpoint was taken as a test-out from a locked unit. */
  testOut: boolean
}

export interface GrammarSessionWritePlan {
  lessonWrites: LessonProgress[]
  unitWrites: UnitProgress[]
  missWrites: CardMiss[]
  response: GrammarSessionResult
}

export type PlanSessionOutcome =
  | { ok: true; plan: GrammarSessionWritePlan }
  | { ok: false; status: 400 | 409; message: string }

const STALE_CONTENT_MESSAGE =
  'Bài vừa được cập nhật. Quay lại lộ trình và làm lại nhé.'

function reject(status: 400 | 409, message: string): PlanSessionOutcome {
  return { message, ok: false, status }
}

interface GradedCard {
  card: PracticeCard
  lessonId: string
  correct: boolean
  expected: string
}

function gradeAnswers(
  course: CourseLookup,
  answers: SessionAnswerInput[]
): GradedCard[] | null {
  const seen = new Set<string>()
  const graded: GradedCard[] = []

  for (const input of answers) {
    const location = course.getCard(input.cardId)

    if (!location || location.card.kind === 'explain') return null
    if (seen.has(location.card.id)) return null

    seen.add(location.card.id)

    const answer = parseCardAnswer(location.card, input.answer)

    if (!answer) return null

    const grade = gradeCard(location.card, answer)

    graded.push({
      card: location.card,
      correct: grade.correct,
      expected: grade.expected,
      lessonId: location.lesson.id,
    })
  }

  return graded
}

function summarize(graded: GradedCard[]) {
  const correctCount = graded.filter(item => item.correct).length
  const total = graded.length

  return {
    accuracy: total === 0 ? 0 : correctCount / total,
    correctCount,
    total,
  }
}

function bumpMisses(
  graded: GradedCard[],
  existing: Map<string, CardMiss>,
  now: Date
): CardMiss[] {
  return graded
    .filter(item => !item.correct)
    .map(item => {
      const previous = existing.get(item.card.id)

      return {
        // Reuse the stored id when the row exists under an alias.
        cardId: previous?.cardId ?? item.card.id,
        clearedAt: null,
        lastMissedAt: now,
        lessonId: previous?.lessonId ?? item.lessonId,
        missCount: (previous?.missCount ?? 0) + 1,
      }
    })
}

function ladderCounters(row: LessonProgress) {
  return {
    correctCount: row.correctCount,
    recallStage: row.recallStage ?? 1,
    reviewCount: row.reviewCount,
    wrongCount: row.wrongCount,
  }
}

function withLadderAnswer(
  row: LessonProgress,
  isCorrect: boolean,
  now: Date
): LessonProgress {
  const patch = applyRecallAnswer({ isCorrect, item: ladderCounters(row), now })

  return {
    ...row,
    correctCount: patch.correctCount,
    dueAt: patch.dueAt,
    masteredAt: patch.masteredAt,
    recallStage: patch.recallStage,
    reviewCount: patch.reviewCount,
    wrongCount: patch.wrongCount,
  }
}

function sameCardSet(graded: GradedCard[], cards: PracticeCard[]) {
  if (graded.length !== cards.length) return false

  const expected = new Set(cards.map(card => card.id))

  return graded.every(item => expected.has(item.card.id))
}

function findUnlockAfterLesson(
  unit: GrammarUnit,
  lesson: GrammarLesson,
  progress: Map<string, LessonProgress>
): SessionUnlock | null {
  const index = unit.lessons.findIndex(item => item.id === lesson.id)
  const nextLesson = unit.lessons[index + 1]

  if (nextLesson && !isLessonPassed(progress.get(nextLesson.id)))
    return { kind: 'lesson', lessonId: nextLesson.id, title: nextLesson.title }

  const allPassed = unit.lessons.every(
    item => item.id === lesson.id || isLessonPassed(progress.get(item.id))
  )

  return allPassed
    ? { kind: 'checkpoint', title: unit.title, unitId: unit.id }
    : null
}

interface PlanInput {
  course: CourseLookup
  progress: ActorGrammarProgress
  submission: GrammarSessionSubmission
  now: Date
}

export function planGrammarSessionWrite({
  course,
  now,
  progress,
  submission,
}: PlanInput): PlanSessionOutcome {
  const graded = gradeAnswers(course, submission.answers)

  if (!graded || graded.length === 0) return reject(400, STALE_CONTENT_MESSAGE)

  const lessonRows = new Map(
    progress.lessonProgress.map(row => [course.resolveId(row.lessonId), row])
  )
  const missRows = new Map(
    progress.misses.map(row => [course.resolveId(row.cardId), row])
  )
  const { accuracy, correctCount, total } = summarize(graded)
  const results = graded.map(item => ({
    cardId: item.card.id,
    correct: item.correct,
    expected: item.expected,
  }))
  const base = {
    accuracy,
    correctCount,
    mode: submission.mode,
    results,
    targetId: submission.targetId,
    testOut: false,
    total,
  }

  switch (submission.mode) {
    case 'lesson': {
      const target = course.getLesson(submission.targetId)

      if (!target) return reject(400, STALE_CONTENT_MESSAGE)
      if (!sameCardSet(graded, course.practiceCards(target.lesson)))
        return reject(400, STALE_CONTENT_MESSAGE)
      if (!isLessonUnlocked({ ...progress, course }, target.lesson.id))
        return reject(409, 'Bài này chưa mở.')

      const before =
        lessonRows.get(target.lesson.id) ??
        emptyLessonProgress(target.lesson.id)
      const stars = starsForAccuracy(accuracy)
      let row: LessonProgress = {
        ...before,
        attempts: before.attempts + 1,
        bestAccuracy: Math.max(before.bestAccuracy, accuracy),
        completedAt: before.completedAt ?? now,
        // `before` keeps the id its row is stored under (it may be an alias),
        // so the write updates that row instead of creating a second one.
        passedBy: 'lesson',
        stars: Math.max(before.stars, stars),
      }

      // Only the first real completion enters the ladder. Calling the ladder
      // with a correct answer (not the initial state) is what makes the first
      // review due tomorrow instead of the moment the lesson ends.
      if (before.recallStage === null) row = withLadderAnswer(row, true, now)

      const unlocked = isLessonPassed(before)
        ? null
        : findUnlockAfterLesson(target.unit, target.lesson, lessonRows)

      return {
        ok: true,
        plan: {
          lessonWrites: [row],
          missWrites: bumpMisses(graded, missRows, now),
          response: { ...base, passed: true, stars, unlocked },
          unitWrites: [],
        },
      }
    }

    case 'review': {
      const target = course.getLesson(submission.targetId)

      if (!target) return reject(400, STALE_CONTENT_MESSAGE)
      if (
        graded.length < REVIEW_MIN_SIZE ||
        graded.length > REVIEW_MAX_SIZE ||
        graded.some(item => item.lessonId !== target.lesson.id)
      )
        return reject(400, STALE_CONTENT_MESSAGE)

      const before = lessonRows.get(target.lesson.id)

      if (
        !before ||
        before.recallStage === null ||
        before.masteredAt ||
        !before.dueAt ||
        before.dueAt.getTime() > now.getTime()
      )
        return reject(409, 'Bài này chưa đến hạn ôn.')

      const passed = accuracy >= PASS_ACCURACY

      return {
        ok: true,
        plan: {
          lessonWrites: [withLadderAnswer(before, passed, now)],
          missWrites: bumpMisses(graded, missRows, now),
          response: { ...base, passed, stars: null, unlocked: null },
          unitWrites: [],
        },
      }
    }

    case 'checkpoint': {
      const unit = course.getUnit(submission.targetId)

      if (!unit) return reject(400, STALE_CONTENT_MESSAGE)
      if (
        graded.length !== CHECKPOINT_SIZE ||
        graded.some(
          item => course.getLesson(item.lessonId)?.unit.id !== unit.id
        )
      )
        return reject(400, STALE_CONTENT_MESSAGE)

      const completed = new Set(progress.unitProgress.map(row => row.unitId))

      if (completed.has(unit.id)) return reject(409, 'Unit này đã hoàn thành.')

      const unitIndex = course.units.findIndex(item => item.id === unit.id)
      const regular =
        isUnitOpen(course.units, unitIndex, completed) &&
        unit.lessons.every(lesson => isLessonPassed(lessonRows.get(lesson.id)))
      const passed = accuracy >= PASS_ACCURACY
      const nextUnit = course.units[unitIndex + 1]
      const response: GrammarSessionResult = {
        ...base,
        passed,
        stars: null,
        testOut: !regular,
        unlocked:
          passed && nextUnit
            ? { kind: 'unit', title: nextUnit.title, unitId: nextUnit.id }
            : null,
      }
      // A test-out learner has never seen these lessons, so their misses are
      // not weak spots yet.
      const missWrites = regular ? bumpMisses(graded, missRows, now) : []

      if (!passed)
        return {
          ok: true,
          plan: { lessonWrites: [], missWrites, response, unitWrites: [] },
        }

      const unitWrites: UnitProgress[] = []
      const lessonWrites: LessonProgress[] = []

      for (const item of course.units.slice(0, unitIndex + 1)) {
        if (completed.has(item.id)) continue

        unitWrites.push({
          completedAt: now,
          passedBy: item.id === unit.id && regular ? 'checkpoint' : 'test',
          unitId: item.id,
        })

        for (const lesson of item.lessons) {
          const row = lessonRows.get(lesson.id)

          if (isLessonPassed(row)) continue

          lessonWrites.push({
            ...(row ?? emptyLessonProgress(lesson.id)),
            completedAt: now,
            passedBy: 'test',
          })
        }
      }

      return {
        ok: true,
        plan: { lessonWrites, missWrites, response, unitWrites },
      }
    }

    case 'weak': {
      // Weak-spot practice only serves cards the learner already missed;
      // anything else would plant misses for lessons never studied.
      if (
        graded.length > WEAK_MAX_SIZE ||
        graded.some(item => {
          const row = missRows.get(item.card.id)

          return !row || row.clearedAt !== null
        })
      )
        return reject(400, STALE_CONTENT_MESSAGE)

      const cleared: CardMiss[] = graded
        .filter(item => item.correct)
        .flatMap(item => {
          const row = missRows.get(item.card.id)

          return row ? [{ ...row, clearedAt: now }] : []
        })

      return {
        ok: true,
        plan: {
          lessonWrites: [],
          missWrites: [...cleared, ...bumpMisses(graded, missRows, now)],
          response: { ...base, passed: true, stars: null, unlocked: null },
          unitWrites: [],
        },
      }
    }
  }
}

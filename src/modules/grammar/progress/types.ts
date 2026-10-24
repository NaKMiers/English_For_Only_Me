/**
 * Persistence-agnostic progress shapes. The Mongo services map documents to
 * these, and every pure function (path builder, session planner, guest merge)
 * works on them alone.
 */

export type LessonPassedBy = 'lesson' | 'test'

export interface LessonProgress {
  lessonId: string
  stars: number
  bestAccuracy: number
  passedBy: LessonPassedBy | null
  completedAt: Date | null
  attempts: number
  /** Null until the lesson is completed as a lesson (test-outs stay off the ladder). */
  recallStage: number | null
  dueAt: Date | null
  reviewCount: number
  correctCount: number
  wrongCount: number
  masteredAt: Date | null
}

export type UnitPassedBy = 'checkpoint' | 'test'

export interface UnitProgress {
  unitId: string
  completedAt: Date
  passedBy: UnitPassedBy
}

export interface CardMiss {
  cardId: string
  lessonId: string
  missCount: number
  lastMissedAt: Date
  clearedAt: Date | null
}

export function isLessonPassed(progress: LessonProgress | undefined) {
  return Boolean(
    progress && (progress.stars >= 1 || progress.passedBy === 'test')
  )
}

export function emptyLessonProgress(lessonId: string): LessonProgress {
  return {
    attempts: 0,
    bestAccuracy: 0,
    completedAt: null,
    correctCount: 0,
    dueAt: null,
    lessonId,
    masteredAt: null,
    passedBy: null,
    recallStage: null,
    reviewCount: 0,
    stars: 0,
    wrongCount: 0,
  }
}

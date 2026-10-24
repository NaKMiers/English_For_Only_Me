import type { CardMiss, LessonProgress, UnitProgress } from './types'

/**
 * Fold a guest's grammar rows into the signed-in user's rows.
 *
 * Grammar rows are unique per (userId, lessonId / unitId / cardId), so the
 * dictation merge's `updateMany` would collide whenever the user already has a
 * row. Instead each pair is combined here and upserted one by one:
 *
 * - lessons: best stars and accuracy, earliest completion, a real lesson pass
 *   beats a test pass, and the ladder comes from whichever side has one (the
 *   user's when both do)
 * - units: earliest completion; a checkpoint pass beats a test pass
 * - misses: higher count, latest miss, still open if either side is open
 */
export interface GrammarMergePlan {
  lessons: LessonProgress[]
  units: UnitProgress[]
  misses: CardMiss[]
}

function earliest(a: Date | null, b: Date | null) {
  if (!a) return b
  if (!b) return a

  return a.getTime() <= b.getTime() ? a : b
}

function mergeLesson(guest: LessonProgress, user: LessonProgress | undefined) {
  if (!user) return guest

  const ladder = user.recallStage !== null ? user : guest

  return {
    ...user,
    attempts: user.attempts + guest.attempts,
    bestAccuracy: Math.max(user.bestAccuracy, guest.bestAccuracy),
    completedAt: earliest(user.completedAt, guest.completedAt),
    correctCount: ladder.correctCount,
    dueAt: ladder.dueAt,
    masteredAt: ladder.masteredAt,
    passedBy:
      user.passedBy === 'lesson' || guest.passedBy === 'lesson'
        ? 'lesson'
        : (user.passedBy ?? guest.passedBy),
    recallStage: ladder.recallStage,
    reviewCount: ladder.reviewCount,
    stars: Math.max(user.stars, guest.stars),
    wrongCount: ladder.wrongCount,
  } satisfies LessonProgress
}

function mergeUnit(guest: UnitProgress, user: UnitProgress | undefined) {
  if (!user) return guest

  return {
    completedAt:
      earliest(user.completedAt, guest.completedAt) ?? user.completedAt,
    passedBy:
      user.passedBy === 'checkpoint' || guest.passedBy === 'checkpoint'
        ? 'checkpoint'
        : 'test',
    unitId: user.unitId,
  } satisfies UnitProgress
}

function mergeMiss(guest: CardMiss, user: CardMiss | undefined) {
  if (!user) return guest

  const latest =
    guest.lastMissedAt.getTime() > user.lastMissedAt.getTime()
      ? guest.lastMissedAt
      : user.lastMissedAt

  return {
    ...user,
    clearedAt: !user.clearedAt || !guest.clearedAt ? null : user.clearedAt,
    lastMissedAt: latest,
    missCount: Math.max(user.missCount, guest.missCount),
  } satisfies CardMiss
}

export function planGrammarGuestMerge(
  guest: GrammarMergePlan,
  user: GrammarMergePlan
): GrammarMergePlan {
  const userLessons = new Map(user.lessons.map(row => [row.lessonId, row]))
  const userUnits = new Map(user.units.map(row => [row.unitId, row]))
  const userMisses = new Map(user.misses.map(row => [row.cardId, row]))

  return {
    lessons: guest.lessons.map(row =>
      mergeLesson(row, userLessons.get(row.lessonId))
    ),
    misses: guest.misses.map(row => mergeMiss(row, userMisses.get(row.cardId))),
    units: guest.units.map(row => mergeUnit(row, userUnits.get(row.unitId))),
  }
}

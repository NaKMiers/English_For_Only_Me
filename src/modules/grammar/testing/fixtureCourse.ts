import { buildCourseLookup } from '@/modules/grammar/course/courseLookup'
import type {
  GrammarCard,
  GrammarLesson,
  GrammarUnit,
} from '@/modules/grammar/course/types'
import {
  emptyLessonProgress,
  type LessonProgress,
} from '@/modules/grammar/progress/types'

/**
 * A tiny 3-unit course for tests: every lesson has 1 explain card and 8
 * choice cards whose correct option is always index 0, so "answer 0" is right
 * and "answer 1" is wrong.
 */
function lesson(unitId: string, index: number): GrammarLesson {
  const id = `${unitId}-l0${index}`
  const cards: GrammarCard[] = [
    { kind: 'explain', id: `${id}-c01`, title: 't', body: 'b', examples: [] },
    ...Array.from({ length: 8 }, (_, card) => ({
      kind: 'choice' as const,
      id: `${id}-c${String(card + 2).padStart(2, '0')}`,
      prompt: 'p',
      options: ['right', 'wrong'],
      answer: 0,
      explain: 'e',
    })),
  ]

  return { id, title: `Lesson ${id}`, titleEn: id, summary: 's', cards }
}

function unit(order: number): GrammarUnit {
  const id = `u0${order}`

  return {
    id,
    order,
    level: 'A1',
    title: `Unit ${order}`,
    summary: 's',
    lessons: [1, 2, 3, 4, 5].map(index => lesson(id, index)),
  }
}

export const FIXTURE_UNITS = [unit(1), unit(2), unit(3)]

export const fixtureCourse = buildCourseLookup(FIXTURE_UNITS, {
  'old-u01-l01': 'u01-l01',
})

export const NOW = new Date('2026-10-24T12:00:00.000Z')

export function daysFrom(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000)
}

export function passedLesson(
  lessonId: string,
  overrides: Partial<LessonProgress> = {}
): LessonProgress {
  return {
    ...emptyLessonProgress(lessonId),
    attempts: 1,
    bestAccuracy: 1,
    completedAt: daysFrom(NOW, -3),
    dueAt: daysFrom(NOW, 2),
    passedBy: 'lesson',
    recallStage: 2,
    stars: 3,
    ...overrides,
  }
}

/** Answers for every practice card of a lesson; `wrong` card ids answer 1. */
export function lessonAnswers(lessonId: string, wrong: string[] = []) {
  const found = fixtureCourse.getLesson(lessonId)

  if (!found) throw new Error(`No fixture lesson ${lessonId}`)

  return fixtureCourse.practiceCards(found.lesson).map(card => ({
    answer: wrong.includes(card.id) ? 1 : 0,
    cardId: card.id,
  }))
}

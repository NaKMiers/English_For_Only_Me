import {
  isPracticeCard,
  type GrammarCard,
  type GrammarLesson,
  type GrammarUnit,
  type PracticeCard,
} from './types'

export interface CardLocation {
  card: GrammarCard
  lesson: GrammarLesson
  unit: GrammarUnit
}

export interface CourseLookup {
  units: GrammarUnit[]
  /** Resolve a possibly-renamed lesson or card id to its current id. */
  resolveId(id: string): string
  getUnit(unitId: string): GrammarUnit | null
  getLesson(
    lessonId: string
  ): { lesson: GrammarLesson; unit: GrammarUnit } | null
  getCard(cardId: string): CardLocation | null
  practiceCards(lesson: GrammarLesson): PracticeCard[]
  unitPracticeCards(unit: GrammarUnit): PracticeCard[]
}

/**
 * Index the course once so every lookup is O(1). Pure: tests build lookups
 * from small fixture courses, the app builds one from `GRAMMAR_COURSE`.
 */
export function buildCourseLookup(
  units: GrammarUnit[],
  aliases: Record<string, string> = {}
): CourseLookup {
  const sorted = [...units].sort((a, b) => a.order - b.order)
  const unitsById = new Map(sorted.map(unit => [unit.id, unit]))
  const lessonsById = new Map<
    string,
    { lesson: GrammarLesson; unit: GrammarUnit }
  >()
  const cardsById = new Map<string, CardLocation>()

  for (const unit of sorted)
    for (const lesson of unit.lessons) {
      lessonsById.set(lesson.id, { lesson, unit })

      for (const card of lesson.cards)
        cardsById.set(card.id, { card, lesson, unit })
    }

  const resolveId = (id: string) => aliases[id] ?? id

  const practiceCards = (lesson: GrammarLesson) =>
    lesson.cards.filter(isPracticeCard)

  return {
    units: sorted,
    resolveId,
    getUnit: unitId => unitsById.get(unitId) ?? null,
    getLesson: lessonId => lessonsById.get(resolveId(lessonId)) ?? null,
    getCard: cardId => cardsById.get(resolveId(cardId)) ?? null,
    practiceCards,
    unitPracticeCards: unit => unit.lessons.flatMap(practiceCards),
  }
}

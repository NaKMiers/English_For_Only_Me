import {
  CHECKPOINT_SIZE,
  REVIEW_MAX_SIZE,
  REVIEW_MIN_SIZE,
  WEAK_MAX_SIZE,
} from '@/modules/grammar/constants'
import type { CourseLookup } from '@/modules/grammar/course/courseLookup'
import type {
  GrammarLesson,
  GrammarUnit,
  PracticeCard,
} from '@/modules/grammar/course/types'
import type { CardMiss } from '@/modules/grammar/progress/types'
import { shuffle, type Rng } from '@/modules/grammar/rng'

/**
 * Which cards a review, checkpoint, or weak-spot session serves. The server
 * page picks them with a seeded rng and the session planner later checks the
 * submitted set against the same size and ownership rules.
 */

function openMissIds(misses: CardMiss[], course: CourseLookup) {
  return new Set(
    misses
      .filter(miss => !miss.clearedAt)
      .map(miss => course.resolveId(miss.cardId))
  )
}

export function buildReviewSet(
  course: CourseLookup,
  lesson: GrammarLesson,
  misses: CardMiss[],
  rng: Rng
): PracticeCard[] {
  const cards = course.practiceCards(lesson)
  const size = Math.min(
    REVIEW_MAX_SIZE,
    Math.max(REVIEW_MIN_SIZE, cards.length)
  )
  const missed = openMissIds(misses, course)
  const first = shuffle(
    cards.filter(card => missed.has(card.id)),
    rng
  )
  const rest = shuffle(
    cards.filter(card => !missed.has(card.id)),
    rng
  )

  return [...first, ...rest].slice(0, size)
}

/** 12 cards spread across the unit's lessons as evenly as possible. */
export function buildCheckpointSet(
  course: CourseLookup,
  unit: GrammarUnit,
  rng: Rng
): PracticeCard[] {
  const pools = unit.lessons.map(lesson =>
    shuffle(course.practiceCards(lesson), rng)
  )
  const picked: PracticeCard[] = []

  for (let round = 0; picked.length < CHECKPOINT_SIZE; round += 1) {
    let added = false

    for (const pool of pools) {
      const card = pool[round]

      if (card && picked.length < CHECKPOINT_SIZE) {
        picked.push(card)
        added = true
      }
    }

    if (!added) break
  }

  return shuffle(picked, rng)
}

/** The most recently missed open cards, newest first. */
export function buildWeakSet(
  course: CourseLookup,
  misses: CardMiss[]
): PracticeCard[] {
  const seen = new Set<string>()
  const cards: PracticeCard[] = []
  const sorted = [...misses]
    .filter(miss => !miss.clearedAt)
    .sort((a, b) => b.lastMissedAt.getTime() - a.lastMissedAt.getTime())

  for (const miss of sorted) {
    const location = course.getCard(miss.cardId)

    if (!location || location.card.kind === 'explain') continue
    if (seen.has(location.card.id)) continue

    seen.add(location.card.id)
    cards.push(location.card)

    if (cards.length >= WEAK_MAX_SIZE) break
  }

  return cards
}

import {
  normalizeGrammarAnswer,
  splitWords,
} from '@/modules/grammar/grading/gradeCard'
import { LESSONS_PER_UNIT } from '@/modules/grammar/constants'

import {
  isPracticeCard,
  type GrammarCard,
  type GrammarLesson,
  type GrammarUnit,
} from './types'

/**
 * Structural checks for hand-written course content. Returns every problem
 * found (empty = valid) so a content edit fails CI with a precise list rather
 * than a crash on the first page that renders the bad card.
 */

const UNIT_ID = /^u\d{2}$/
const MIN_CARDS = 10
const MAX_CARDS = 15
const MIN_EXPLAIN = 3
const MIN_PRACTICE = 8
// Built from its code point so this file never contains the banned character.
const EM_DASH = String.fromCharCode(0x2014)

function collectStrings(value: unknown, into: string[]) {
  if (typeof value === 'string') into.push(value)
  else if (Array.isArray(value))
    for (const item of value) collectStrings(item, into)
  else if (value && typeof value === 'object')
    for (const item of Object.values(value)) collectStrings(item, into)
}

function wordBag(sentence: string) {
  return splitWords(sentence)
    .map(word => normalizeGrammarAnswer(word))
    .sort()
    .join('|')
}

function hasDuplicates(values: string[]) {
  return new Set(values.map(normalizeGrammarAnswer)).size !== values.length
}

function validateCard(card: GrammarCard, where: string): string[] {
  const errors: string[] = []
  const strings: string[] = []

  collectStrings(card, strings)

  if (strings.some(text => text.includes(EM_DASH)))
    errors.push(`${where}: contains an em dash`)

  if (card.kind === 'explain') {
    if (!card.title.trim()) errors.push(`${where}: explain card needs a title`)
    if (!card.body.trim()) errors.push(`${where}: explain card needs a body`)
    if (card.body.length > 420)
      errors.push(`${where}: explain body is too long`)
    if (card.examples.length === 0)
      errors.push(`${where}: explain card needs an example`)

    return errors
  }

  if (!card.prompt.trim()) errors.push(`${where}: missing prompt`)
  if (!card.explain.trim()) errors.push(`${where}: missing explanation`)

  switch (card.kind) {
    case 'choice':
      if (card.options.length < 2 || card.options.length > 4)
        errors.push(`${where}: choice needs 2-4 options`)
      if (hasDuplicates(card.options))
        errors.push(`${where}: choice options repeat`)
      if (
        !Number.isInteger(card.answer) ||
        card.answer < 0 ||
        card.answer >= card.options.length
      )
        errors.push(`${where}: choice answer index out of range`)
      break
    case 'fill': {
      const blanks = card.sentence.split('___').length - 1

      if (blanks !== 1) errors.push(`${where}: fill needs exactly one ___`)
      if (card.answers.length === 0 || card.answers.some(item => !item.trim()))
        errors.push(`${where}: fill needs non-empty answers`)
      if (card.bank) {
        if (card.bank.length < 2 || card.bank.length > 6)
          errors.push(`${where}: fill bank needs 2-6 tiles`)
        if (hasDuplicates(card.bank)) errors.push(`${where}: fill bank repeats`)
        if (
          !card.bank.some(
            tile =>
              normalizeGrammarAnswer(tile) ===
              normalizeGrammarAnswer(card.answers[0] ?? '')
          )
        )
          errors.push(`${where}: fill bank must contain the first answer`)
      }
      break
    }
    case 'order': {
      const words = splitWords(card.sentence)

      if (words.length < 3 || words.length > 14)
        errors.push(`${where}: order sentence needs 3-14 words`)
      for (const alternative of card.alternatives ?? [])
        if (wordBag(alternative) !== wordBag(card.sentence))
          errors.push(`${where}: alternative "${alternative}" uses other words`)
      for (const distractor of card.distractors ?? [])
        if (
          words.some(
            word =>
              normalizeGrammarAnswer(word) ===
              normalizeGrammarAnswer(distractor)
          )
        )
          errors.push(`${where}: distractor "${distractor}" is in the sentence`)
      break
    }
    case 'fix':
      if (card.tokens.length < 3) errors.push(`${where}: fix needs 3+ tokens`)
      if (
        !Number.isInteger(card.wrongIndex) ||
        card.wrongIndex < 0 ||
        card.wrongIndex >= card.tokens.length
      )
        errors.push(`${where}: fix wrongIndex out of range`)
      else if (
        normalizeGrammarAnswer(card.tokens[card.wrongIndex] ?? '') ===
        normalizeGrammarAnswer(card.correction)
      )
        errors.push(`${where}: fix correction equals the wrong token`)
      break
  }

  return errors
}

function validateLesson(
  lesson: GrammarLesson,
  unit: GrammarUnit,
  seenCardIds: Set<string>
): string[] {
  const errors: string[] = []
  const where = lesson.id

  if (!new RegExp(`^${unit.id}-l\\d{2}$`).test(lesson.id))
    errors.push(`${where}: lesson id must look like ${unit.id}-lNN`)
  if (!lesson.title.trim() || !lesson.titleEn.trim() || !lesson.summary.trim())
    errors.push(`${where}: needs title, titleEn and summary`)
  if (lesson.cards.length < MIN_CARDS || lesson.cards.length > MAX_CARDS)
    errors.push(`${where}: needs ${MIN_CARDS}-${MAX_CARDS} cards`)

  const explainCount = lesson.cards.filter(
    card => card.kind === 'explain'
  ).length
  const practiceCount = lesson.cards.filter(isPracticeCard).length

  if (explainCount < MIN_EXPLAIN)
    errors.push(`${where}: needs at least ${MIN_EXPLAIN} explain cards`)
  if (practiceCount < MIN_PRACTICE)
    errors.push(`${where}: needs at least ${MIN_PRACTICE} practice cards`)
  if (lesson.cards[0]?.kind !== 'explain')
    errors.push(`${where}: must open with an explain card`)

  for (const card of lesson.cards) {
    const cardWhere = `${lesson.id}/${card.id}`

    if (!new RegExp(`^${lesson.id}-c\\d{2}$`).test(card.id))
      errors.push(`${cardWhere}: card id must look like ${lesson.id}-cNN`)
    if (seenCardIds.has(card.id)) errors.push(`${cardWhere}: duplicate card id`)

    seenCardIds.add(card.id)
    errors.push(...validateCard(card, cardWhere))
  }

  return errors
}

export function validateCourse(units: GrammarUnit[]): string[] {
  const errors: string[] = []
  const seenUnitIds = new Set<string>()
  const seenLessonIds = new Set<string>()
  const seenCardIds = new Set<string>()
  const orders = new Set<number>()

  for (const unit of units) {
    if (!UNIT_ID.test(unit.id))
      errors.push(`${unit.id}: unit id must look like uNN`)
    if (seenUnitIds.has(unit.id)) errors.push(`${unit.id}: duplicate unit id`)
    if (orders.has(unit.order)) errors.push(`${unit.id}: duplicate order`)
    if (unit.lessons.length !== LESSONS_PER_UNIT)
      errors.push(`${unit.id}: needs exactly ${LESSONS_PER_UNIT} lessons`)
    if (!unit.title.trim() || !unit.summary.trim())
      errors.push(`${unit.id}: needs title and summary`)

    seenUnitIds.add(unit.id)
    orders.add(unit.order)

    for (const lesson of unit.lessons) {
      if (seenLessonIds.has(lesson.id))
        errors.push(`${lesson.id}: duplicate lesson id`)

      seenLessonIds.add(lesson.id)
      errors.push(...validateLesson(lesson, unit, seenCardIds))
    }
  }

  return errors
}

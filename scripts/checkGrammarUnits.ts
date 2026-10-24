/**
 * Validate grammar unit files before they are wired into the course.
 *
 *   bun run grammar:check src/modules/grammar/course/units/u05.ts [more files]
 *
 * Runs the same structural validator as the test suite, then feeds every
 * card's canonical answer back through the grader. Exits 1 on any problem.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

import { validateCourse } from '@/modules/grammar/course/validateCourse'
import {
  isPracticeCard,
  type GrammarUnit,
  type PracticeCard,
} from '@/modules/grammar/course/types'
import { gradeCard, splitWords } from '@/modules/grammar/grading/gradeCard'

function canonicalGrade(card: PracticeCard) {
  switch (card.kind) {
    case 'choice':
      return gradeCard(card, { kind: 'choice', value: card.answer })
    case 'fill':
      return gradeCard(card, { kind: 'fill', value: card.answers[0] ?? '' })
    case 'order':
      return gradeCard(card, {
        kind: 'order',
        value: splitWords(card.sentence),
      })
    case 'fix':
      return gradeCard(card, { kind: 'fix', value: card.wrongIndex })
  }
}

async function loadUnits(paths: string[]) {
  const units: GrammarUnit[] = []

  for (const path of paths) {
    const loaded = (await import(pathToFileURL(resolve(path)).href)) as Record<
      string,
      unknown
    >

    for (const value of Object.values(loaded))
      if (value && typeof value === 'object' && 'lessons' in value)
        units.push(value as GrammarUnit)
  }

  return units
}

async function main() {
  const paths = process.argv.slice(2)

  if (paths.length === 0) {
    console.error('Usage: bun run grammar:check <unit file> [...]')
    process.exit(1)
  }

  const units = await loadUnits(paths)
  const errors = validateCourse(units)

  for (const unit of units)
    for (const lesson of unit.lessons)
      for (const card of lesson.cards.filter(isPracticeCard))
        if (!canonicalGrade(card).correct)
          errors.push(`${card.id}: canonical answer does not grade as correct`)

  const cardCount = units.reduce(
    (sum, unit) =>
      sum +
      unit.lessons.reduce((total, lesson) => total + lesson.cards.length, 0),
    0
  )

  if (errors.length > 0) {
    console.error(errors.join('\n'))
    process.exit(1)
  }

  console.info(`OK: ${units.length} unit(s), ${cardCount} cards`)
}

void main()

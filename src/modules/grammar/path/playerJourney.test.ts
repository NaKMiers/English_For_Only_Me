import { describe, expect, it } from 'vitest'

import {
  fixtureCourse,
  NOW,
  passedLesson,
} from '@/modules/grammar/testing/fixtureCourse'

import { buildGrammarPath } from './buildGrammarPath'
import { buildPlayerJourney } from './playerJourney'

const path = buildGrammarPath({
  course: fixtureCourse,
  lessonProgress: [passedLesson('u01-l01')],
  misses: [],
  now: NOW,
  unitProgress: [],
})

describe('buildPlayerJourney', () => {
  it('finds the lesson unit, the path next and the next unit start', () => {
    const journey = buildPlayerJourney(path, 'lesson', 'u01-l02')

    expect(journey.unit?.id).toBe(path.units[0]?.id)
    expect(journey.next).toEqual(path.next)
    expect(journey.nextUnitFirstLessonId).toBe(
      path.units[1]?.lessons[0]?.id ?? null
    )
  })

  it('a checkpoint targets its unit; weak practice has no unit', () => {
    const unitId = path.units[0]?.id ?? ''

    expect(buildPlayerJourney(path, 'checkpoint', unitId).unit?.id).toBe(
      unitId
    )
    expect(buildPlayerJourney(path, 'weak', 'weak').unit).toBeNull()
  })
})

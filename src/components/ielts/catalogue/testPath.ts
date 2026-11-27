import type { IeltsTestBands } from '@/modules/ielts/attempts/testBands'
import type { IeltsSkill } from '@/modules/ielts/constants'

/** Where a test stands for the learner, from the skills they have a band on. */
export type TestNodeState = 'new' | 'partial' | 'done'

interface PathEntry {
  id: string
  skills: { skill: IeltsSkill }[]
}

interface PathGroup<T extends PathEntry> {
  heading: string
  tests: Array<{ entry: T }>
}

/** `done` once every skill of the test has a band, `partial` with some. */
export function testNodeState(
  entry: PathEntry,
  bands: IeltsTestBands
): TestNodeState {
  const banded = entry.skills.filter(
    ({ skill }) => bands[entry.id]?.[skill] !== undefined
  ).length

  if (banded === 0) return 'new'

  return banded === entry.skills.length ? 'done' : 'partial'
}

/** How many tests of a book are done. */
export function groupProgress<T extends PathEntry>(
  group: PathGroup<T>,
  bands: IeltsTestBands
) {
  const done = group.tests.filter(
    ({ entry }) => testNodeState(entry, bands) === 'done'
  ).length

  return { done, total: group.tests.length }
}

/**
 * The test the path points at, in display order: finish what is started
 * first (the first `partial` test), otherwise the first untouched one. Null
 * when every test is done.
 */
export function pickNextTest<T extends PathEntry>(
  groups: PathGroup<T>[],
  bands: IeltsTestBands
): { entry: T; heading: string } | null {
  for (const wanted of ['partial', 'new'] as const)
    for (const group of groups)
      for (const { entry } of group.tests)
        if (testNodeState(entry, bands) === wanted)
          return { entry, heading: group.heading }

  return null
}

/** The journey's milestones, as a share of all steps. */
export const JOURNEY_MILESTONES = [
  { at: 0.1, key: 'camp' },
  { at: 0.3, key: 'ridge' },
  { at: 0.6, key: 'peak' },
  { at: 1, key: 'summit' },
] as const

export type JourneyMilestoneKey = (typeof JOURNEY_MILESTONES)[number]['key']

export interface JourneyTotals {
  booksDone: number
  steps: number
  testsDone: number
  totalBooks: number
  totalSteps: number
  totalTests: number
}

/**
 * How far the learner has come. One step is one skill of one test with a
 * band, so every finished skill moves the journey on; tests and books count
 * as cleared once every skill in them has a band.
 */
export function journeyTotals<T extends PathEntry>(
  groups: PathGroup<T>[],
  bands: IeltsTestBands
): JourneyTotals {
  const totals: JourneyTotals = {
    booksDone: 0,
    steps: 0,
    testsDone: 0,
    totalBooks: groups.length,
    totalSteps: 0,
    totalTests: 0,
  }

  for (const group of groups) {
    const progress = groupProgress(group, bands)

    if (progress.total > 0 && progress.done === progress.total)
      totals.booksDone += 1
    totals.testsDone += progress.done
    totals.totalTests += progress.total

    for (const { entry } of group.tests) {
      totals.totalSteps += entry.skills.length
      totals.steps += entry.skills.filter(
        ({ skill }) => bands[entry.id]?.[skill] !== undefined
      ).length
    }
  }

  return totals
}

/**
 * The next milestone still ahead and the steps left to it, or null once the
 * summit is reached.
 */
export function nextMilestone(steps: number, totalSteps: number) {
  for (const milestone of JOURNEY_MILESTONES) {
    const target = Math.ceil(milestone.at * totalSteps)

    if (steps < target)
      return { key: milestone.key, left: target - steps, target }
  }

  return null
}

/** Finished attempts started within the last seven days. */
export function stepsThisWeek(
  attempts: { band: number | null; startedAt: string; status: string }[],
  now: Date
) {
  const since = now.getTime() - 7 * 24 * 60 * 60 * 1000

  return attempts.filter(
    attempt =>
      attempt.status !== 'in_progress' &&
      new Date(attempt.startedAt).getTime() >= since
  ).length
}

/** The first skill of a test that has no band yet, or null when all do. */
export function nextSkillOf(entry: PathEntry, bands: IeltsTestBands) {
  return (
    entry.skills.find(({ skill }) => bands[entry.id]?.[skill] === undefined)
      ?.skill ?? null
  )
}

/** Id of the "You are here" station, the target of the Continue button. */
export const HERE_STATION_ID = 'ielts-station-here'

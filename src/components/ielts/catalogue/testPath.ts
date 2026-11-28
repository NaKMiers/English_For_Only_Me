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

export type JourneySegmentState = 'ahead' | 'current' | 'done'

export interface JourneySegment {
  /** Where the stage starts and ends on the trail, 0 to 1. */
  from: number
  key: JourneyMilestoneKey
  /** Steps still to take in this stage (its full size when ahead). */
  left: number
  state: JourneySegmentState
  to: number
}

/**
 * The trail cut into its stages, one per milestone: start to Base camp,
 * Base camp to Ridge and so on, each with the steps still left in it.
 */
export function journeySegments(
  steps: number,
  totalSteps: number
): JourneySegment[] {
  let from = 0
  let start = 0

  return JOURNEY_MILESTONES.map(milestone => {
    const target = Math.ceil(milestone.at * totalSteps)
    const left = Math.max(0, target - Math.max(steps, start))
    const state: JourneySegmentState =
      steps >= target ? 'done' : steps >= start ? 'current' : 'ahead'
    const segment = { from, key: milestone.key, left, state, to: milestone.at }

    from = milestone.at
    start = target

    return segment
  })
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

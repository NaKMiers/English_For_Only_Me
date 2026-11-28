import type { IeltsSkill } from '../constants'
import type { IeltsAttemptSummary } from './attemptQueries'

/** Best band per skill, keyed by test id. Only tests the learner has a band on. */
export type IeltsTestBands = Record<string, Partial<Record<IeltsSkill, number>>>

export interface IeltsTestBandRow {
  testId: string
  skill: IeltsSkill
  band: number
}

/** Keeps the highest band per test and skill: the card shows a personal best. */
export function bestBandsByTest(rows: IeltsTestBandRow[]): IeltsTestBands {
  const bands: IeltsTestBands = {}

  for (const { band, skill, testId } of rows) {
    const test = (bands[testId] ??= {})
    const current = test[skill]

    if (current === undefined || band > current) test[skill] = band
  }

  return bands
}

/** Best band per skill of one test, from its finished attempts. */
export function bandsFromAttempts(
  testId: string,
  attempts: Pick<IeltsAttemptSummary, 'band' | 'skill' | 'status'>[]
): IeltsTestBands {
  const best: Partial<Record<IeltsSkill, number>> = {}

  for (const attempt of attempts)
    if (attempt.status !== 'in_progress' && attempt.band !== null)
      best[attempt.skill] = Math.max(best[attempt.skill] ?? 0, attempt.band)

  return { [testId]: best }
}

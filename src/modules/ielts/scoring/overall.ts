import type { IeltsSkill } from '../constants'
import { roundOverallBand } from './roundBand'

export interface IeltsBandedAttempt {
  skill: IeltsSkill
  band: number
  testId: string | null
  testVersion: number
  sessionId: string | null
  scoredAt: Date
}

export interface IeltsOverallEstimate {
  band: number
  skills: IeltsSkill[]
  basis: 'session' | 'test' | 'mixed'
}

function latestPerSkill(attempts: IeltsBandedAttempt[]) {
  const bySkill = new Map<IeltsSkill, IeltsBandedAttempt>()

  for (const attempt of attempts) {
    const current = bySkill.get(attempt.skill)

    if (!current || attempt.scoredAt > current.scoredAt)
      bySkill.set(attempt.skill, attempt)
  }

  return [...bySkill.values()]
}

function estimate(
  attempts: IeltsBandedAttempt[],
  basis: IeltsOverallEstimate['basis']
): IeltsOverallEstimate {
  const mean =
    attempts.reduce((sum, attempt) => sum + attempt.band, 0) / attempts.length

  return {
    band: roundOverallBand(mean),
    skills: attempts.map(attempt => attempt.skill),
    basis,
  }
}

/**
 * Overall estimate from band-bearing attempts (full-skill practice or mock).
 * Priority: the newest full mock session with 2+ skills, then the newest test
 * version with 2+ skills, then the latest band per skill across tests.
 */
export function overallEstimate(
  attempts: IeltsBandedAttempt[]
): IeltsOverallEstimate | null {
  if (attempts.length === 0) return null

  const newestFirst = [...attempts].sort(
    (left, right) => right.scoredAt.getTime() - left.scoredAt.getTime()
  )

  for (const attempt of newestFirst) {
    if (!attempt.sessionId) continue

    const session = latestPerSkill(
      attempts.filter(item => item.sessionId === attempt.sessionId)
    )

    if (session.length >= 2) return estimate(session, 'session')
  }

  for (const attempt of newestFirst) {
    if (!attempt.testId) continue

    const sameTest = latestPerSkill(
      attempts.filter(
        item =>
          item.testId === attempt.testId &&
          item.testVersion === attempt.testVersion
      )
    )

    if (sameTest.length >= 2) return estimate(sameTest, 'test')
  }

  return estimate(latestPerSkill(attempts), 'mixed')
}

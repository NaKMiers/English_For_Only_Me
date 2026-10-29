import { IELTS_DRILL_MAX_GROUPS, IELTS_OBJECTIVE_TOTAL } from '../constants'
import type { IeltsQuestionGroup } from '../schema'

export interface IeltsDrillCandidate {
  testId: string
  testSlug: string
  version: number
  sectionKey: string
  group: IeltsQuestionGroup
}

export const drillCandidateKey = (candidate: {
  testSlug: string
  version: number
  groupId: string
}) => `${candidate.testSlug}:${candidate.version}:${candidate.groupId}`

/**
 * Pure: up to `max` groups for a drill. Groups the learner has not drilled
 * recently come first, the rest are shuffled, and the drill never exceeds
 * 40 questions.
 */
export function selectDrillGroups(
  candidates: IeltsDrillCandidate[],
  {
    max = IELTS_DRILL_MAX_GROUPS,
    random = Math.random,
    recentKeys = new Set<string>(),
  }: { max?: number; random?: () => number; recentKeys?: Set<string> } = {}
): IeltsDrillCandidate[] {
  const shuffled = candidates
    .map(candidate => ({ candidate, sort: random() }))
    .sort((left, right) => left.sort - right.sort)
    .map(entry => entry.candidate)
  const isRecent = (candidate: IeltsDrillCandidate) =>
    recentKeys.has(
      drillCandidateKey({
        testSlug: candidate.testSlug,
        version: candidate.version,
        groupId: candidate.group.id,
      })
    )
  const ordered = [
    ...shuffled.filter(candidate => !isRecent(candidate)),
    ...shuffled.filter(isRecent),
  ]
  const picked: IeltsDrillCandidate[] = []
  let total = 0

  for (const candidate of ordered) {
    if (picked.length >= max) break

    const size = candidate.group.questions.length

    if (total + size > IELTS_OBJECTIVE_TOTAL) continue

    picked.push(candidate)
    total += size
  }

  return picked
}

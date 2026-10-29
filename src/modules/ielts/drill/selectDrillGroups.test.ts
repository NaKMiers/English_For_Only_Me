import { describe, expect, it } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'
import {
  buildDrillSections,
  planDrillNumbers,
} from '../attempts/attemptSections'
import { buildAnswerKey } from '../scoring/answerKey'
import { scoreObjective } from '../scoring/scoreObjective'
import {
  drillCandidateKey,
  type IeltsDrillCandidate,
  selectDrillGroups,
} from './selectDrillGroups'

const candidates: IeltsDrillCandidate[] = IELTS_SAMPLE_TEST.sections.flatMap(
  section =>
    section.groups
      .filter(group => group.type === 'multiple-choice')
      .map(group => ({
        testId: 't1',
        testSlug: IELTS_SAMPLE_TEST.slug,
        version: 1,
        sectionKey: section.key,
        group,
      }))
)

describe('selectDrillGroups', () => {
  it('returns nothing when no group has that type', () => {
    expect(selectDrillGroups([])).toEqual([])
  })

  it('caps the group count and puts recently drilled groups last', () => {
    const recent = new Set(
      candidates
        .slice(0, candidates.length - 1)
        .map(candidate =>
          drillCandidateKey({ ...candidate, groupId: candidate.group.id })
        )
    )
    const picked = selectDrillGroups(candidates, {
      max: 2,
      random: () => 0.5,
      recentKeys: recent,
    })

    expect(picked).toHaveLength(2)
    expect(picked[0].group.id).toBe(candidates.at(-1)?.group.id)
  })

  it('renumbers picked groups 1..N and scores them', () => {
    const picked = selectDrillGroups(candidates, { max: 3, random: () => 0 })
    const maps = planDrillNumbers(picked.map(item => item.group))
    const items = picked.map((item, index) => ({
      testId: item.testId,
      testSlug: item.testSlug,
      version: item.version,
      sectionKey: item.sectionKey,
      groupId: item.group.id,
      numberMap: maps[index],
    }))
    const sections = buildDrillSections(
      items,
      item =>
        IELTS_SAMPLE_TEST.sections.find(
          section => section.key === item.sectionKey
        ) ?? null
    )
    const key = buildAnswerKey(sections)

    expect(key.questions.map(question => question.number)).toEqual([1, 2, 3])
    expect(
      scoreObjective(
        key,
        Object.fromEntries(
          key.questions.map(question => [
            String(question.number),
            question.accepted[0],
          ])
        )
      ).raw
    ).toBe(3)
  })
})

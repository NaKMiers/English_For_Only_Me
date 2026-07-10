import { describe, expect, it } from 'vitest'

import type { DictationTopicApiRecord } from '@/modules/dictation/types'

import { buildTopicSummaries } from './topicSummaries'

const topic = (id: string, over: Partial<DictationTopicApiRecord> = {}) =>
  ({
    id,
    slug: `t-${id}`,
    title: `Topic ${id}`,
    description: null,
    thumbnailUrl: null,
    hasVideoMedia: false,
    order: 0,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    ...over,
  }) satisfies DictationTopicApiRecord

describe('buildTopicSummaries', () => {
  it('merges lesson/section counts and derives the level range', () => {
    const [summary] = buildTopicSummaries(
      [topic('1')],
      [{ topicId: '1', lessonCount: 12, levels: ['A1', 'C1', 'B1'] }],
      [{ topicId: '1', sectionCount: 3 }]
    )

    expect(summary.lessonCount).toBe(12)
    expect(summary.sectionCount).toBe(3)
    expect(summary.levelRange).toBe('A1–C1')
  })

  it('zeroes counts and nulls the range for a topic with no aggregates', () => {
    const [summary] = buildTopicSummaries([topic('2')], [], [])

    expect(summary.lessonCount).toBe(0)
    expect(summary.sectionCount).toBe(0)
    expect(summary.levelRange).toBeNull()
  })

  it('preserves topic order and matches aggregates by id', () => {
    const summaries = buildTopicSummaries(
      [topic('a'), topic('b')],
      [{ topicId: 'b', lessonCount: 5, levels: ['B2'] }],
      [{ topicId: 'a', sectionCount: 1 }]
    )

    expect(summaries.map(s => s.id)).toEqual(['a', 'b'])
    expect(summaries[0].sectionCount).toBe(1)
    expect(summaries[0].lessonCount).toBe(0)
    expect(summaries[1].lessonCount).toBe(5)
    expect(summaries[1].levelRange).toBe('B2')
  })
})

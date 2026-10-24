import { describe, expect, test, vi } from 'vitest'

import { VOCAB_REQUIRES_VI_MEANING_FILTER } from '@/modules/vocabulary/vietnameseMeaning'

import {
  buildVocabWordListPipeline,
  parseVocabWordListView,
} from './vocabWordListService'

vi.mock('@/models/dictation/DictationVideoModel', () => ({}))
vi.mock('@/models/vocabulary/UserVocabItemModel', () => ({}))
vi.mock('@/models/vocabulary/VocabEntryModel', () => ({}))
vi.mock('@/models/vocabulary/VocabOccurrenceModel', () => ({}))

function build(page: number) {
  return buildVocabWordListPipeline({
    entryCollection: 'vocabentries',
    filter: { status: 'learning', userId: 'u1' },
    page,
    perPage: 20,
    view: 'learning',
  })
}

describe('vocabWordListService', () => {
  test('parses supported list views', () => {
    expect(parseVocabWordListView('dueToday')).toBe('dueToday')
    expect(parseVocabWordListView('knownTotal')).toBe('knownTotal')
  })

  test('falls back to learning for unknown views', () => {
    expect(parseVocabWordListView(undefined)).toBe('learning')
    expect(parseVocabWordListView('nope')).toBe('learning')
  })

  test('filters on the entry before paging so pages and totals match', () => {
    const pipeline = build(3)
    const stageNames = pipeline.map(stage => Object.keys(stage)[0])

    expect(stageNames).toEqual([
      '$match',
      '$sort',
      '$lookup',
      '$unwind',
      '$facet',
    ])
    expect(pipeline[0]).toEqual({
      $match: { status: 'learning', userId: 'u1' },
    })

    const lookup = (pipeline[2] as { $lookup: Record<string, unknown> }).$lookup
    expect(lookup).toMatchObject({
      from: 'vocabentries',
      localField: 'vocabEntryId',
      foreignField: '_id',
      as: 'entry',
    })
    expect((lookup.pipeline as unknown[])[0]).toEqual({
      $match: VOCAB_REQUIRES_VI_MEANING_FILTER,
    })

    // Skip/limit live inside the facet, after the join, next to the count.
    expect(pipeline[4]).toEqual({
      $facet: {
        total: [{ $count: 'count' }],
        rows: [{ $skip: 40 }, { $limit: 20 }],
      },
    })
  })

  test('projects only the fields a word card renders', () => {
    const lookup = (build(1)[2] as { $lookup: { pipeline: unknown[] } }).$lookup
    const project = (lookup.pipeline[1] as { $project: object }).$project

    expect(Object.keys(project).sort()).toEqual([
      'createdAt',
      'definitions',
      'enrichmentStatus',
      'frequencyRank',
      'localizedMeanings',
      'normalizedTerm',
      'phonetics',
      'term',
      'updatedAt',
    ])
    expect(project).toMatchObject({
      definitions: { $slice: ['$definitions', 1] },
    })
  })

  test('sorts by the view order with _id as the stable tie-break', () => {
    expect(build(1)[1]).toEqual({ $sort: { dueAt: 1, updatedAt: -1, _id: 1 } })
    expect(
      buildVocabWordListPipeline({
        entryCollection: 'vocabentries',
        filter: {},
        page: 0,
        perPage: 10,
        view: 'mastered',
      })
    ).toContainEqual({ $sort: { masteredAt: -1, updatedAt: -1, _id: 1 } })
  })
})

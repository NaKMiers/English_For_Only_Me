import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { TAXONOMY_PATH } from '@/modules/grammar/seed/loadGrammarContent'

import {
  buildGrammarMapResult,
  GRAMMAR_MAP_POINT_FIELDS,
  type GrammarMapPoint,
  matchesStudyFilter,
  toGrammarMapPoint,
} from './grammarMapPoints'

const now = new Date('2026-10-24T12:00:00.000Z')
const past = new Date('2026-10-24T11:00:00.000Z')
const future = new Date('2026-10-25T12:00:00.000Z')

function point(slug: string): GrammarMapPoint {
  return toGrammarMapPoint({
    cefrLevel: 'A1',
    family: 'articles',
    l1Risk: 'high',
    reviewStatus: 'unverified',
    slug,
    title: slug,
  })
}

describe('matchesStudyFilter', () => {
  const learningDue = {
    dueAt: past,
    pointSlug: 'a',
    recallStage: 2,
    status: 'learning',
  }
  const learningLater = { ...learningDue, dueAt: future }
  const learningUndated = { ...learningDue, dueAt: null }
  const mastered = { ...learningDue, status: 'mastered' }

  it('passes everything without a study filter', () => {
    expect(
      matchesStudyFilter({ item: undefined, now, studyStatus: null })
    ).toBe(true)
  })

  it('treats notStarted as the absence of a row', () => {
    expect(
      matchesStudyFilter({ item: undefined, now, studyStatus: 'notStarted' })
    ).toBe(true)
    expect(
      matchesStudyFilter({ item: mastered, now, studyStatus: 'notStarted' })
    ).toBe(false)
  })

  it('treats due as a learning row whose dueAt has passed', () => {
    expect(
      matchesStudyFilter({ item: learningDue, now, studyStatus: 'due' })
    ).toBe(true)
    expect(
      matchesStudyFilter({
        item: { ...learningDue, dueAt: now },
        now,
        studyStatus: 'due',
      })
    ).toBe(true)
    expect(
      matchesStudyFilter({ item: learningLater, now, studyStatus: 'due' })
    ).toBe(false)
    expect(
      matchesStudyFilter({ item: learningUndated, now, studyStatus: 'due' })
    ).toBe(false)
    expect(
      matchesStudyFilter({
        item: { ...mastered, dueAt: past },
        now,
        studyStatus: 'due',
      })
    ).toBe(false)
    expect(
      matchesStudyFilter({ item: undefined, now, studyStatus: 'due' })
    ).toBe(false)
  })

  it('matches any other filter on the exact status', () => {
    expect(
      matchesStudyFilter({ item: mastered, now, studyStatus: 'mastered' })
    ).toBe(true)
    expect(
      matchesStudyFilter({ item: learningLater, now, studyStatus: 'mastered' })
    ).toBe(false)
    expect(
      matchesStudyFilter({ item: undefined, now, studyStatus: 'learning' })
    ).toBe(false)
  })
})

describe('buildGrammarMapResult', () => {
  const points = ['a', 'b', 'c', 'd'].map(point)
  const items = [
    { dueAt: past, pointSlug: 'b', recallStage: 3, status: 'learning' },
    { dueAt: null, pointSlug: 'd', recallStage: 1, status: 'ignored' },
  ]

  it('attaches learner rows and keeps the cached order', () => {
    const result = buildGrammarMapResult({
      items,
      limit: 200,
      now,
      points,
      studyStatus: null,
    })

    expect(result.total).toBe(4)
    expect(result.points.map(item => item.slug)).toEqual(['a', 'b', 'c', 'd'])
    expect(result.points[1]?.learner).toEqual({
      dueAt: past.toISOString(),
      recallStage: 3,
      status: 'learning',
    })
    expect(result.points[0]?.learner).toBeNull()
  })

  it('filters before capping so total counts every match', () => {
    const result = buildGrammarMapResult({
      items,
      limit: 1,
      now,
      points,
      studyStatus: 'notStarted',
    })

    expect(result.total).toBe(2)
    expect(result.points.map(item => item.slug)).toEqual(['a'])
  })

  it('projects the real taxonomy to a small fraction of the full documents', () => {
    // Unit-level estimate of what /grammar/points pulls from Mongo per view:
    // the old query loaded whole documents, the map now selects leaf fields.
    const full = JSON.parse(readFileSync(TAXONOMY_PATH, 'utf8')) as Record<
      string,
      unknown
    >[]
    const fields = GRAMMAR_MAP_POINT_FIELDS.split(' ')
    const projected = full.map(row =>
      Object.fromEntries(fields.map(field => [field, row[field] ?? null]))
    )
    const fullBytes = JSON.stringify(full).length
    const projectedBytes = JSON.stringify(projected).length

    expect(full.length).toBeGreaterThan(100)
    expect(projectedBytes / fullBytes).toBeLessThan(0.05)
  })
})

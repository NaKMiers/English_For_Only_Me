import { describe, expect, it } from 'vitest'

import { matchesCatalogueSearch, sortCatalogue } from './catalogueFilters'
import { groupCatalogue } from './catalogueGroups'

const tests = [
  {
    title: 'IELTS 2 Test 1',
    track: 'academic' as const,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-30T00:00:00.000Z',
  },
  {
    title: 'IELTS 15 Test 2',
    track: 'academic' as const,
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
  },
  {
    title: 'IELTS 15 Test 1',
    track: 'academic' as const,
    createdAt: '2026-10-10T00:00:00.000Z',
    updatedAt: '2026-10-11T00:00:00.000Z',
  },
  { title: 'Old import', track: 'general' as const, createdAt: null },
]

const titles = (entries: { title: string }[]) =>
  entries.map(entry => entry.title)

describe('sortCatalogue', () => {
  it('puts the newest created first and undated tests last', () => {
    expect(titles(sortCatalogue(tests, 'newest'))).toEqual([
      'IELTS 15 Test 2',
      'IELTS 15 Test 1',
      'IELTS 2 Test 1',
      'Old import',
    ])
  })

  it('sorts oldest first, by last update, and by title', () => {
    expect(titles(sortCatalogue(tests, 'oldest'))[0]).toBe('Old import')
    expect(titles(sortCatalogue(tests, 'updated'))[0]).toBe('IELTS 2 Test 1')
    expect(titles(sortCatalogue(tests, 'title'))).toEqual([
      'IELTS 2 Test 1',
      'IELTS 15 Test 1',
      'IELTS 15 Test 2',
      'Old import',
    ])
  })

  it('orders series by their newest test but keeps cards numbered', () => {
    const groups = groupCatalogue(sortCatalogue(tests, 'newest'))

    expect(groups.map(group => group.heading)).toEqual([
      'IELTS 15 Academic',
      'IELTS 2 Academic',
      'General tests',
    ])
    expect(groups[0].tests.map(test => test.label)).toEqual([
      'Test 1',
      'Test 2',
    ])
  })

  it('falls back to the publish date when there is no creation date', () => {
    const sorted = sortCatalogue(
      [
        { title: 'A', track: 'academic', publishedAt: '2026-01-01' },
        { title: 'B', track: 'academic', publishedAt: '2026-03-01' },
      ],
      'newest'
    )

    expect(titles(sorted)).toEqual(['B', 'A'])
  })

  it('does not change the list it was given', () => {
    sortCatalogue(tests, 'title')
    expect(tests[0].title).toBe('IELTS 2 Test 1')
  })
})

describe('matchesCatalogueSearch', () => {
  it('needs every word, in any field, ignoring case', () => {
    expect(matchesCatalogueSearch(tests[1], '15 ACADEMIC')).toBe(true)
    expect(matchesCatalogueSearch(tests[1], '15 general')).toBe(false)
    expect(
      matchesCatalogueSearch(
        { title: 'C19 Test 2', series: 'Cambridge 19', track: 'academic' },
        'cambridge'
      )
    ).toBe(true)
  })

  it('matches everything on an empty query', () => {
    expect(matchesCatalogueSearch(tests[3], '   ')).toBe(true)
  })
})

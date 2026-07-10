import { describe, expect, it } from 'vitest'

import {
  buildVideoMongoFilter,
  buildVideoMongoSort,
  isBrowseQueryActive,
  matchesBrowseQuery,
  paginate,
  parseBrowseQuery,
} from './browseQuery'

describe('parseBrowseQuery', () => {
  it('defaults cleanly and coerces arrays to the first value', () => {
    expect(parseBrowseQuery({})).toEqual({
      search: '',
      level: null,
      sort: 'newest',
      page: 1,
    })
    expect(
      parseBrowseQuery({ search: ['hi', 'x'], page: ['3'] })
    ).toMatchObject({
      search: 'hi',
      page: 3,
    })
  })

  it('rejects invalid level/sort/page', () => {
    const q = parseBrowseQuery({ level: 'Z9', sort: 'bogus', page: '-2' })
    expect(q.level).toBeNull()
    expect(q.sort).toBe('newest')
    expect(q.page).toBe(1)
  })

  it('accepts valid CEFR level and sort', () => {
    const q = parseBrowseQuery({ level: 'B1', sort: 'title', page: '2' })
    expect(q).toEqual({ search: '', level: 'B1', sort: 'title', page: 2 })
  })
})

describe('isBrowseQueryActive', () => {
  it('is active only with a search or level', () => {
    expect(isBrowseQueryActive(parseBrowseQuery({}))).toBe(false)
    expect(isBrowseQueryActive(parseBrowseQuery({ sort: 'title' }))).toBe(false)
    expect(isBrowseQueryActive(parseBrowseQuery({ search: 'a' }))).toBe(true)
    expect(isBrowseQueryActive(parseBrowseQuery({ level: 'A1' }))).toBe(true)
  })
})

describe('buildVideoMongoFilter', () => {
  it('escapes regex metacharacters in search', () => {
    const filter = buildVideoMongoFilter(parseBrowseQuery({ search: 'a.b*c' }))
    expect(filter.title).toEqual({ $regex: 'a\\.b\\*c', $options: 'i' })
  })

  it('adds level and omits empty search', () => {
    expect(buildVideoMongoFilter(parseBrowseQuery({ level: 'C1' }))).toEqual({
      level: 'C1',
    })
  })
})

describe('buildVideoMongoSort', () => {
  it('maps sort keys', () => {
    expect(buildVideoMongoSort(parseBrowseQuery({ sort: 'oldest' }))).toEqual({
      createdAt: 1,
    })
    expect(buildVideoMongoSort(parseBrowseQuery({ sort: 'title' }))).toEqual({
      title: 1,
    })
    expect(buildVideoMongoSort(parseBrowseQuery({}))).toEqual({ createdAt: -1 })
  })
})

describe('matchesBrowseQuery', () => {
  const video = { title: 'Short Story One', level: 'B1' as const }

  it('matches on case-insensitive title substring and level', () => {
    expect(
      matchesBrowseQuery(video, parseBrowseQuery({ search: 'story' }))
    ).toBe(true)
    expect(matchesBrowseQuery(video, parseBrowseQuery({ level: 'B1' }))).toBe(
      true
    )
    expect(matchesBrowseQuery(video, parseBrowseQuery({ level: 'A1' }))).toBe(
      false
    )
    expect(matchesBrowseQuery(video, parseBrowseQuery({ search: 'zzz' }))).toBe(
      false
    )
  })
})

describe('paginate', () => {
  it('computes skip and bounds, clamping the page', () => {
    expect(paginate(1, 45, 20)).toMatchObject({
      totalPages: 3,
      skip: 0,
      hasPrev: false,
      hasNext: true,
    })
    expect(paginate(3, 45, 20)).toMatchObject({ skip: 40, hasNext: false })
    expect(paginate(99, 45, 20)).toMatchObject({ page: 3, skip: 40 })
    expect(paginate(1, 0, 20)).toMatchObject({ totalPages: 1, hasNext: false })
  })
})

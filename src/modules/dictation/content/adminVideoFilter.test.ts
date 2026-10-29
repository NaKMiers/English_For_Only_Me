import { describe, expect, it } from 'vitest'

import {
  type AdminFilterableVideo,
  type AdminVideoFilter,
  countActiveAdminFilters,
  countAdminVideoFacets,
  EMPTY_ADMIN_VIDEO_FILTER,
  filterAdminVideos,
  parseAdminVideoFilter,
  writeAdminVideoFilter,
} from './adminVideoFilter'

function video(
  title: string,
  overrides: Partial<AdminFilterableVideo> = {}
): AdminFilterableVideo & { id: string } {
  return {
    id: title,
    title,
    channelTitle: null,
    level: null,
    status: 'ready',
    topicId: null,
    topicTitle: null,
    sectionId: null,
    sectionTitle: null,
    createdAt: 0,
    durationSeconds: null,
    ...overrides,
  }
}

const videos = [
  video('Why cats purr', {
    level: 'B2',
    topicId: 't1',
    topicTitle: 'Science',
    sectionId: 's1',
    sectionTitle: 'Animals',
    createdAt: 3,
    durationSeconds: 300,
  }),
  video('How bridges stand', {
    level: 'C1',
    channelTitle: 'Engineering Hub',
    topicId: 't1',
    topicTitle: 'Science',
    createdAt: 1,
    durationSeconds: 600,
  }),
  video('Ordering coffee', {
    status: 'needsTranscript',
    createdAt: 2,
  }),
]

const filter = (patch: Partial<AdminVideoFilter>) => ({
  ...EMPTY_ADMIN_VIDEO_FILTER,
  ...patch,
})
const ids = (list: Array<{ id: string }>) => list.map(item => item.id)

describe('filterAdminVideos', () => {
  it('keeps the drag order when nothing is set', () => {
    expect(ids(filterAdminVideos(videos, EMPTY_ADMIN_VIDEO_FILTER))).toEqual([
      'Why cats purr',
      'How bridges stand',
      'Ordering coffee',
    ])
  })

  it('needs every search word, across title, channel, topic and section', () => {
    expect(
      ids(filterAdminVideos(videos, filter({ search: 'science hub' })))
    ).toEqual(['How bridges stand'])
    expect(
      ids(filterAdminVideos(videos, filter({ search: 'ANIMALS purr' })))
    ).toEqual(['Why cats purr'])
  })

  it('ORs within a facet and ANDs across facets, with `none` for blanks', () => {
    expect(
      ids(filterAdminVideos(videos, filter({ levels: ['B2', 'none'] })))
    ).toEqual(['Why cats purr', 'Ordering coffee'])
    expect(
      ids(
        filterAdminVideos(
          videos,
          filter({ levels: ['B2', 'none'], statuses: ['ready'] })
        )
      )
    ).toEqual(['Why cats purr'])
  })

  it('filters by topic, no topic and section', () => {
    expect(ids(filterAdminVideos(videos, filter({ topicId: 'none' })))).toEqual(
      ['Ordering coffee']
    )
    expect(
      ids(
        filterAdminVideos(videos, filter({ topicId: 't1', sectionId: 'none' }))
      )
    ).toEqual(['How bridges stand'])
  })

  it('sorts by date, title and duration (missing durations last)', () => {
    expect(ids(filterAdminVideos(videos, filter({ sort: 'newest' })))).toEqual([
      'Why cats purr',
      'Ordering coffee',
      'How bridges stand',
    ])
    expect(ids(filterAdminVideos(videos, filter({ sort: 'title' })))).toEqual([
      'How bridges stand',
      'Ordering coffee',
      'Why cats purr',
    ])
    expect(
      ids(filterAdminVideos(videos, filter({ sort: 'shortest' })))
    ).toEqual(['Why cats purr', 'How bridges stand', 'Ordering coffee'])
    expect(ids(filterAdminVideos(videos, filter({ sort: 'longest' })))).toEqual(
      ['How bridges stand', 'Why cats purr', 'Ordering coffee']
    )
  })
})

describe('countAdminVideoFacets', () => {
  it('counts each facet as if its own selection were cleared', () => {
    const counts = countAdminVideoFacets(
      videos,
      filter({ levels: ['B2'], topicId: 't1' })
    )

    expect(counts.levels).toEqual({ B2: 1, C1: 1 })
    expect(counts.statuses).toEqual({ ready: 1 })
    expect(counts.topics).toEqual({ t1: 1 })
    expect(counts.sections).toEqual({ s1: 1 })
  })
})

describe('URL round trip', () => {
  it('writes only non-defaults, keeps other keys and reads them back', () => {
    const value = filter({
      search: ' cats ',
      levels: ['B2', 'none'],
      statuses: ['failed'],
      topicId: 't1',
      sectionId: 's1',
      sort: 'newest',
    })
    const params = writeAdminVideoFilter(
      new URLSearchParams('view=list&level=A1'),
      value
    )

    expect(params.toString()).toBe(
      'view=list&level=B2%2Cnone&q=cats&status=failed&topic=t1&section=s1&sort=newest'
    )
    expect(parseAdminVideoFilter(params)).toEqual({ ...value, search: 'cats' })
    expect(
      writeAdminVideoFilter(params, EMPTY_ADMIN_VIDEO_FILTER).toString()
    ).toBe('view=list')
  })

  it('drops unknown values and a section without a topic', () => {
    expect(
      parseAdminVideoFilter(
        new URLSearchParams('level=Z9,B1&status=archived&section=s1&sort=x')
      )
    ).toEqual(filter({ levels: ['B1'] }))
  })
})

describe('countActiveAdminFilters', () => {
  it('counts each facet value, not the sort', () => {
    expect(
      countActiveAdminFilters(
        filter({
          search: 'x',
          levels: ['A1', 'B1'],
          topicId: 'none',
          sort: 'title',
        })
      )
    ).toBe(4)
  })
})

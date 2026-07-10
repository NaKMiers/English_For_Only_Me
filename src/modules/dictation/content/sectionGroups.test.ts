import { describe, expect, it } from 'vitest'

import { buildSectionGroups, type GroupableVideo } from './sectionGroups'

const video = (
  id: string,
  sectionId: string | null,
  over: Partial<GroupableVideo> = {}
): GroupableVideo => ({
  id,
  title: `Video ${id}`,
  level: null,
  sectionId,
  practiceHref: `/dictation/videos/${id}/practice`,
  favorited: false,
  done: false,
  ...over,
})

describe('buildSectionGroups', () => {
  it('groups videos under their sections in section order', () => {
    const groups = buildSectionGroups(
      [
        { id: 's1', title: 'Section 1' },
        { id: 's2', title: 'Section 2' },
      ],
      [video('a', 's2'), video('b', 's1'), video('c', 's1')]
    )

    expect(groups.map(g => g.title)).toEqual(['Section 1', 'Section 2'])
    expect(groups[0].videos.map(v => v.id)).toEqual(['b', 'c'])
    expect(groups[1].videos.map(v => v.id)).toEqual(['a'])
  })

  it('keeps empty sections (admin created them on purpose)', () => {
    const groups = buildSectionGroups([{ id: 's1', title: 'Section 1' }], [])

    expect(groups).toHaveLength(1)
    expect(groups[0].videos).toEqual([])
  })

  it('appends an Ungrouped group only when sectionless videos exist', () => {
    const withUngrouped = buildSectionGroups(
      [{ id: 's1', title: 'Section 1' }],
      [video('a', 's1'), video('b', null)]
    )
    expect(withUngrouped.map(g => g.key)).toEqual(['s1', 'ungrouped'])
    expect(withUngrouped[1].videos.map(v => v.id)).toEqual(['b'])

    const withoutUngrouped = buildSectionGroups(
      [{ id: 's1', title: 'Section 1' }],
      [video('a', 's1')]
    )
    expect(withoutUngrouped.map(g => g.key)).toEqual(['s1'])
  })

  it('carries practiceHref (null when no transcript) through to items', () => {
    const [group] = buildSectionGroups(
      [{ id: 's1', title: 'Section 1' }],
      [video('a', 's1', { practiceHref: null })]
    )

    expect(group.videos[0].practiceHref).toBeNull()
  })
})

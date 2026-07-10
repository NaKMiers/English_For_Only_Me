import { describe, expect, it } from 'vitest'

import { reconcileSections } from './AdminTopicCard'
import type { AdminSectionData } from './AdminTopicCard'

function video(id: string) {
  return {
    id,
    title: id,
    level: null,
    status: 'ready' as const,
    thumbnailUrl: null,
    youtubeVideoId: null,
  }
}

function section(id: string, videoIds: string[]): AdminSectionData {
  return { id, title: id, videos: videoIds.map(video) }
}

describe('reconcileSections', () => {
  it('keeps the local (dragged) order when the video set is unchanged', () => {
    // The user dragged the section to [c, a, b]; a stale server refresh still
    // reports [a, b, c]. The local order must win so the drag does not snap back.
    const local = [section('s1', ['c', 'a', 'b'])]
    const server = [section('s1', ['a', 'b', 'c'])]

    const result = reconcileSections(local, server)

    expect(result[0].videos.map(v => v.id)).toEqual(['c', 'a', 'b'])
  })

  it('adopts the server order when membership changed (a move/add/remove)', () => {
    const local = [section('s1', ['a', 'b'])]
    const server = [section('s1', ['a', 'b', 'c'])]

    const result = reconcileSections(local, server)

    expect(result[0].videos.map(v => v.id)).toEqual(['a', 'b', 'c'])
  })

  it('takes sections that only exist on the server', () => {
    const result = reconcileSections([], [section('s2', ['x'])])

    expect(result.map(s => s.id)).toEqual(['s2'])
  })

  it('uses the server video objects even when keeping local order', () => {
    const local = [section('s1', ['b', 'a'])]
    const server: AdminSectionData[] = [
      {
        id: 's1',
        title: 's1',
        videos: [
          { ...video('a'), title: 'fresh-a' },
          { ...video('b'), title: 'fresh-b' },
        ],
      },
    ]

    const result = reconcileSections(local, server)

    expect(result[0].videos.map(v => v.id)).toEqual(['b', 'a'])
    expect(result[0].videos.map(v => v.title)).toEqual(['fresh-b', 'fresh-a'])
  })
})

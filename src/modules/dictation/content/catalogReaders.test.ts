import { describe, expect, it, vi } from 'vitest'

const { repository } = vi.hoisted(() => {
  const at = new Date('2026-10-01T00:00:00.000Z')

  return {
    repository: {
      countAllVideos: vi.fn(async () => 9),
      countNoTopicVideos: vi.fn(async () => 4),
      getTopicBySlug: vi.fn(async (slug: string) =>
        slug === 'stories'
          ? { createdAt: at, id: 't1', slug, updatedAt: at }
          : null
      ),
      listNoTopicVideos: vi.fn(async () => []),
      listSectionsForTopic: vi.fn(async (topicId: string) => [
        { createdAt: at, id: 's1', topicId, updatedAt: at },
      ]),
      listTopicSummaries: vi.fn(async () => []),
      listTopics: vi.fn(async () => [
        { createdAt: at, id: 't1', slug: 'stories', updatedAt: at },
      ]),
      listVideosForTopic: vi.fn(async (topicId: string) => [
        { createdAt: at, id: 'v1', topicId, updatedAt: at },
      ]),
    },
  }
})

vi.mock('./contentRepository', () => repository)
vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn(async () => undefined),
}))
// Every call behaves like a cache hit: the value comes back from JSON text.
vi.mock('next/cache', () => ({
  unstable_cache:
    <Args extends unknown[], Result>(fn: (...args: Args) => Promise<Result>) =>
    async (...args: Args) =>
      JSON.parse(JSON.stringify(await fn(...args))) as Result,
}))

const {
  getCachedNoTopicCount,
  getCachedTopicCatalog,
  getCachedTopics,
  getCachedVideoCount,
} = await import('./catalogReaders')

describe('dictation catalog readers', () => {
  it('revives topic, section and video dates from the cached JSON', async () => {
    const catalog = await getCachedTopicCatalog('  Stories ')

    expect(repository.getTopicBySlug).toHaveBeenCalledWith('stories')
    expect(catalog?.topic.updatedAt).toBeInstanceOf(Date)
    expect(catalog?.sections[0]?.createdAt).toBeInstanceOf(Date)
    expect(catalog?.videos[0]?.updatedAt).toBeInstanceOf(Date)
    expect(repository.listSectionsForTopic).toHaveBeenCalledWith('t1')
  })

  it('returns null for an unknown slug without loading its children', async () => {
    repository.listSectionsForTopic.mockClear()

    expect(await getCachedTopicCatalog('missing')).toBeNull()
    expect(repository.listSectionsForTopic).not.toHaveBeenCalled()
  })

  it('passes plain values and topic lists through', async () => {
    expect(await getCachedNoTopicCount()).toBe(4)
    expect(await getCachedVideoCount()).toBe(9)
    expect((await getCachedTopics())[0]?.createdAt).toBeInstanceOf(Date)
  })
})

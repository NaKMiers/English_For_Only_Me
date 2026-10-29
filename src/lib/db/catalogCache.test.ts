import { beforeEach, describe, expect, it, vi } from 'vitest'

const { calls, connectDatabase } = vi.hoisted(() => ({
  calls: [] as { keyParts: string[]; options: unknown }[],
  connectDatabase: vi.fn(async () => undefined),
}))

vi.mock('./connectDatabase', () => ({ connectDatabase }))

// Stand-in for the Next data cache: stores the JSON text like the real one, so
// the second call is a "hit" served from the stored string.
vi.mock('next/cache', () => ({
  unstable_cache: <Args extends unknown[], Result>(
    fn: (...args: Args) => Promise<Result>,
    keyParts: string[],
    options: unknown
  ) => {
    calls.push({ keyParts, options })
    const store = new Map<string, string>()

    return async (...args: Args) => {
      const cacheKey = JSON.stringify(args)
      const hit = store.get(cacheKey)

      if (hit !== undefined) return JSON.parse(hit) as Result

      const result = await fn(...args)
      store.set(cacheKey, JSON.stringify(result))
      return result
    }
  },
}))

const { CACHE_TAG_LIST, CATALOG_CACHE_VERSION, createCatalogReader } =
  await import('./catalogCache')
const { reviveDates } = await import('./jsonRecords')

interface Topic {
  id: string
  updatedAt: Date
}

describe('createCatalogReader', () => {
  beforeEach(() => {
    connectDatabase.mockClear()
    calls.length = 0
  })

  it('connects inside the cached loader and revives dates on miss and hit', async () => {
    const load = vi.fn(async (slug: string) => ({
      id: { toJSON: () => `id-${slug}` } as unknown as string,
      updatedAt: new Date('2026-10-24T00:00:00.000Z'),
    }))
    const read = createCatalogReader({
      key: 'test-topic',
      load,
      revive: value => reviveDates<Topic>(value, ['updatedAt']),
      tag: 'dictation-catalog',
    })

    const miss = await read('a')
    const hit = await read('a')

    expect(load).toHaveBeenCalledTimes(1)
    expect(connectDatabase).toHaveBeenCalledTimes(1)
    // Same shape either way: ids are strings, dates are Dates.
    expect(miss).toEqual({ id: 'id-a', updatedAt: new Date('2026-10-24') })
    expect(hit).toEqual(miss)
    expect(hit.updatedAt).toBeInstanceOf(Date)
    expect(calls[0]).toEqual({
      keyParts: ['test-topic', `v${CATALOG_CACHE_VERSION}`],
      options: { revalidate: 300, tags: ['dictation-catalog'] },
    })
  })

  it('keys every reader on the cache version so a shape change misses', () => {
    createCatalogReader({
      key: 'test-versioned',
      load: async () => 1,
      revive: value => value,
      tag: 'dictation-catalog',
    })

    expect(Number.isInteger(CATALOG_CACHE_VERSION)).toBe(true)
    expect(CATALOG_CACHE_VERSION).toBeGreaterThan(0)
    expect(calls[0]?.keyParts).toEqual([
      'test-versioned',
      `v${CATALOG_CACHE_VERSION}`,
    ])
  })

  it('uses the grammar safety-net window for grammar content', () => {
    createCatalogReader({
      key: 'test-grammar',
      load: async () => 1,
      revive: value => value,
      tag: 'grammar-content',
    })

    expect(calls[0]?.options).toEqual({
      revalidate: 3600,
      tags: ['grammar-content'],
    })
  })

  it('lists exactly the three content tags', () => {
    expect(CACHE_TAG_LIST).toEqual([
      'dictation-catalog',
      'grammar-content',
      'ielts-content',
    ])
  })
})

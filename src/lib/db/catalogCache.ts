import 'server-only'

import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { CACHE_REVALIDATE_SECONDS, type CacheTag } from './cacheTags'
import { connectDatabase } from './connectDatabase'
import { type Jsonify, toJsonSafe } from './jsonRecords'

export { CACHE_TAG_LIST, CACHE_TAGS, type CacheTag } from './cacheTags'

type CacheArg = string | number | boolean | null

/**
 * Part of every catalog cache key. The Next data cache survives deploys, so a
 * deploy that changes the shape of any cached record (a field added, renamed
 * or retyped in a loader's result) would hand old JSON to new code. Bump this
 * whenever that happens: the new deploy then reads fresh keys and the old
 * entries age out unused.
 */
export const CATALOG_CACHE_VERSION = 1

/**
 * Wrap a shared-content loader in the Next data cache.
 *
 * - The loader connects to the database itself (a cache hit never does) and
 *   must read no cookies or headers.
 * - Its result is JSON round-tripped before it is cached AND before it is
 *   returned, so a miss and a hit hand back the same shape. `revive` turns that
 *   JSON back into the record type (dates, mostly).
 * - React cache() on top dedupes repeat calls within one request, such as
 *   generateMetadata and the page resolving the same slug.
 * - `key` must be unique per reader: unstable_cache keys on the callback's
 *   source text, which is the same for every reader built here.
 */
export function createCatalogReader<Args extends CacheArg[], Result>({
  key,
  load,
  revive,
  tag,
}: {
  key: string
  load: (...args: Args) => Promise<Result>
  revive: (value: Jsonify<Result>) => Result
  tag: CacheTag
}): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(
    async (...args: Args) => {
      await connectDatabase()

      return toJsonSafe(await load(...args))
    },
    [key, `v${CATALOG_CACHE_VERSION}`],
    { revalidate: CACHE_REVALIDATE_SECONDS[tag], tags: [tag] }
  )

  return cache(async (...args: Args) => revive(await cached(...args)))
}

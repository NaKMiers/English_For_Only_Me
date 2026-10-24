import 'server-only'

import { revalidateTag } from 'next/cache'

import { CACHE_TAGS, type CacheTag } from '@/lib/db/cacheTags'

/**
 * Hard expiry for revalidateTag. The 'max' profile only marks entries stale,
 * so the next visitor still gets the old copy while a fresh one builds in the
 * background - wrong right after an admin or import edit. With expire 0 the
 * next read is a blocking cache miss that sees the write.
 */
export const EXPIRE_NOW = { expire: 0 }

/**
 * Expire shared-content tags from a route handler. Server actions use
 * updateTag instead (read-your-own-writes in the same request).
 */
export function expireCacheTags(tags: readonly CacheTag[]) {
  for (const tag of tags) revalidateTag(tag, EXPIRE_NOW)
}

/**
 * Expire the cached dictation catalog after a route handler changes videos or
 * transcripts.
 */
export function revalidateDictationCatalog() {
  expireCacheTags([CACHE_TAGS.dictationCatalog])
}

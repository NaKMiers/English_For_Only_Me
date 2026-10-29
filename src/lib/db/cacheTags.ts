/**
 * Tags on the shared-content cache. Shared catalog only - nothing per-user is
 * ever cached under these, so one entry serves every visitor.
 *
 * Server actions invalidate with updateTag (read-your-own-writes), route
 * handlers with expireCacheTags (revalidateTag(tag, { expire: 0 }), a hard
 * expiry - see revalidateCatalog.ts) and scripts with the secret-protected
 * POST /api/admin/revalidate, which does the same. The Next data cache
 * survives deploys, so content written outside the app (seed scripts) must
 * end with one of those calls.
 */
export const CACHE_TAGS = {
  dictationCatalog: 'dictation-catalog',
  grammarContent: 'grammar-content',
  ieltsContent: 'ielts-content',
} as const

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS]

export const CACHE_TAG_LIST = Object.values(CACHE_TAGS) as [
  CacheTag,
  ...CacheTag[],
]

/**
 * Time-based safety net, in seconds. Some writes that change catalog fields
 * (video import, transcript status) happen in route handlers, and a missed
 * invalidation there should cost minutes of staleness, never forever.
 */
export const CACHE_REVALIDATE_SECONDS: Record<CacheTag, number> = {
  'dictation-catalog': 300,
  'grammar-content': 3600,
  // Published IELTS versions never change; publish and archive expire the tag.
  'ielts-content': 3600,
}

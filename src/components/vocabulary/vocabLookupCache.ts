import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'
import {
  lookupVocabEntryApi,
  recordVocabOccurrenceApi,
  type VocabOccurrenceInput,
} from '@/requests/vocabularyApi'

/**
 * Short-lived memory cache of quick lookups, keyed by learner + term, so
 * tapping the same word twice in a practice session opens instantly. It lives
 * in memory only (a reload starts fresh) and is keyed by owner, so a sign-in or
 * sign-out in the same tab never shows one learner's word state to another.
 *
 * Word state also changes elsewhere (a mark on the dashboard or word list, a
 * recall answer, another tab): those writes drop the entry when they settle
 * (`invalidateCachedVocabEntry`), and every entry expires after a few minutes
 * so a change this tab never saw cannot linger for the whole session.
 */
export const VOCAB_LOOKUP_CACHE_TTL_MS = 5 * 60_000

interface CachedLookup {
  expiresAt: number
  record: VocabEntryWithUserStateRecord
}

const cache = new Map<string, CachedLookup>()

export function getVocabLookupCacheKey(owner: string | null, term: string) {
  return `${owner ?? 'anonymous'}:${term.trim().toLowerCase()}`
}

export function readCachedVocabLookup(
  owner: string | null,
  term: string,
  now = Date.now()
) {
  const key = getVocabLookupCacheKey(owner, term)
  const cached = cache.get(key)

  if (!cached) return null

  if (cached.expiresAt <= now) {
    cache.delete(key)
    return null
  }

  return cached.record
}

export function writeCachedVocabLookup(
  owner: string | null,
  term: string,
  record: VocabEntryWithUserStateRecord,
  now = Date.now()
) {
  cache.set(getVocabLookupCacheKey(owner, term), {
    expiresAt: now + VOCAB_LOOKUP_CACHE_TTL_MS,
    record,
  })
}

/** Keep every cached lookup of this entry in step with a mark. */
export function updateCachedVocabUserItem(
  owner: string | null,
  entryId: string,
  userItem: UserVocabItemApiRecord | null
) {
  const prefix = `${owner ?? 'anonymous'}:`

  for (const [key, cached] of cache)
    if (key.startsWith(prefix) && cached.record.entry.id === entryId)
      cache.set(key, { ...cached, record: { ...cached.record, userItem } })
}

/**
 * Drop every cached lookup of this entry, for every learner: the writer may
 * not know whose key it is, and a miss only costs one fresh lookup.
 */
export function invalidateCachedVocabEntry(entryId: string) {
  for (const [key, cached] of cache)
    if (cached.record.entry.id === entryId) cache.delete(key)
}

export function clearVocabLookupCache() {
  cache.clear()
}

/**
 * Look a word up, from the cache when possible. Every call is one lookup
 * event and records exactly one occurrence: a cache miss records it inside the
 * lookup request (server side, after the response), a cache hit sends it as a
 * separate fire-and-forget write.
 */
export async function lookupVocabEntryCached({
  occurrence,
  owner,
  term,
}: {
  occurrence: VocabOccurrenceInput
  owner: string | null
  term: string
}) {
  const cached = readCachedVocabLookup(owner, term)

  if (cached) {
    recordVocabOccurrenceApi({
      occurrence,
      vocabEntryId: cached.entry.id,
    }).catch(() => {
      // Side data that is safe to lose; the lookup itself already succeeded.
    })

    return cached
  }

  const record = await lookupVocabEntryApi({ occurrence, term })

  writeCachedVocabLookup(owner, term, record)

  return record
}

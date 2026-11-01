import type { IeltsTrack } from '@/modules/ielts/constants'

import { TRACK_LABELS } from './catalogueGroups'

export type CatalogueSort = 'newest' | 'oldest' | 'updated' | 'title'

export const CATALOGUE_SORT_LABELS: Record<CatalogueSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  updated: 'Recently updated',
  title: 'Title A-Z',
}

/** The few words the sort button has room for. */
export const CATALOGUE_SORT_SHORT_LABELS: Record<CatalogueSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  updated: 'Updated',
  title: 'A-Z',
}

interface CatalogueItem {
  title: string
  track: IeltsTrack
  series?: string
  slug?: string
  createdAt?: string | null
  updatedAt?: string | null
  publishedAt?: string | null
}

function time(value: string | null | undefined) {
  return value ? Date.parse(value) || 0 : 0
}

// A catalogue cached before `createdAt` was added still has `publishedAt`.
function created(entry: CatalogueItem) {
  return time(entry.createdAt ?? entry.publishedAt)
}

/**
 * Orders tests before `groupCatalogue`, which keeps first-seen order: so with
 * "newest" a series sits where its newest test would, while its cards still
 * read Test 1, 2, 3. Title order compares numbers as numbers (IELTS 2 before
 * IELTS 15).
 */
export function sortCatalogue<T extends CatalogueItem>(
  entries: T[],
  sort: CatalogueSort
): T[] {
  const sorted = [...entries]

  switch (sort) {
    case 'newest':
      return sorted.sort((left, right) => created(right) - created(left))
    case 'oldest':
      return sorted.sort((left, right) => created(left) - created(right))
    case 'updated':
      return sorted.sort(
        (left, right) => time(right.updatedAt) - time(left.updatedAt)
      )
    case 'title':
      return sorted.sort((left, right) =>
        left.title.localeCompare(right.title, undefined, { numeric: true })
      )
  }
}

/**
 * Every word of the query has to appear somewhere in the title, series, slug
 * or track, so "15 academic" finds "IELTS 15 Test 2" on the Academic track.
 */
export function matchesCatalogueSearch(entry: CatalogueItem, query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true

  const haystack = [
    entry.title,
    entry.series ?? '',
    entry.slug ?? '',
    TRACK_LABELS[entry.track],
  ]
    .join(' ')
    .toLowerCase()

  return words.every(word => haystack.includes(word))
}

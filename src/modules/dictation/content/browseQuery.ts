import {
  isDictationLevel,
  type DictationLevel,
} from '@/modules/dictation/levels'

export type BrowseSort = 'order' | 'newest' | 'oldest' | 'title'

export interface BrowseQuery {
  search: string
  level: DictationLevel | null
  sort: BrowseSort
  page: number
}

export const BROWSE_PAGE_SIZE = 20

const SORTS: BrowseSort[] = ['order', 'newest', 'oldest', 'title']

/** Parse raw (string | string[] | undefined) search params into a clean query. */
export function parseBrowseQuery(params: {
  search?: string | string[]
  level?: string | string[]
  sort?: string | string[]
  page?: string | string[]
}): BrowseQuery {
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() ?? ''

  const levelRaw = first(params.level)
  const sortRaw = first(params.sort)
  const pageNum = Number.parseInt(first(params.page), 10)

  return {
    search: first(params.search).slice(0, 100),
    level: isDictationLevel(levelRaw) ? levelRaw : null,
    sort: (SORTS as string[]).includes(sortRaw)
      ? (sortRaw as BrowseSort)
      : 'order',
    page: Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1,
  }
}

/** True when the user has narrowed results (flat list mode vs accordion). */
export function isBrowseQueryActive(query: BrowseQuery): boolean {
  return query.search !== '' || query.level !== null
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Mongo filter fragment for search + level (merge into a base filter). */
export function buildVideoMongoFilter(
  query: BrowseQuery
): Record<string, unknown> {
  const filter: Record<string, unknown> = {}
  if (query.level) filter.level = query.level
  if (query.search)
    filter.title = { $regex: escapeRegex(query.search), $options: 'i' }

  return filter
}

export function buildVideoMongoSort(
  query: BrowseQuery
): Record<string, 1 | -1> {
  switch (query.sort) {
    case 'order':
      return { order: 1, createdAt: -1 }
    case 'oldest':
      return { createdAt: 1 }
    case 'title':
      return { title: 1 }
    default:
      return { createdAt: -1 }
  }
}

/** In-memory predicate mirroring the Mongo filter (for the admin table). */
export function matchesBrowseQuery(
  video: { title: string; level: DictationLevel | null },
  query: BrowseQuery
): boolean {
  if (query.level && video.level !== query.level) return false
  if (
    query.search &&
    !video.title.toLowerCase().includes(query.search.toLowerCase())
  )
    return false

  return true
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  skip: number
  hasPrev: boolean
  hasNext: boolean
}

export function paginate(
  page: number,
  total: number,
  pageSize = BROWSE_PAGE_SIZE
): Pagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const clamped = Math.min(Math.max(1, page), totalPages)

  return {
    page: clamped,
    pageSize,
    total,
    totalPages,
    skip: (clamped - 1) * pageSize,
    hasPrev: clamped > 1,
    hasNext: clamped < totalPages,
  }
}

import Link from 'next/link'

import { cn } from '@/lib/utils'
import type {
  BrowseQuery,
  Pagination,
} from '@/modules/dictation/content/browseQuery'

const linkClass =
  'border-manga-black bg-manga-white inline-flex min-h-9 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)]'

/** Prev/next pager (Link-based, URL-driven) preserving the active query. */
export function BrowsePagination({
  pagination,
  query,
  basePath,
}: {
  pagination: Pagination
  query: BrowseQuery
  basePath: string
}) {
  if (pagination.totalPages <= 1) return null

  function href(page: number) {
    const params = new URLSearchParams()
    if (query.search) params.set('search', query.search)
    if (query.level) params.set('level', query.level)
    if (query.sort !== 'newest') params.set('sort', query.sort)
    if (page > 1) params.set('page', String(page))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3"
    >
      {pagination.hasPrev ? (
        <Link
          href={href(pagination.page - 1)}
          className={linkClass}
        >
          ← Prev
        </Link>
      ) : (
        <span
          className={cn(linkClass, 'opacity-40')}
          aria-disabled="true"
        >
          ← Prev
        </span>
      )}
      <span className="text-manga-ink-soft font-sans text-sm font-black">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      {pagination.hasNext ? (
        <Link
          href={href(pagination.page + 1)}
          className={linkClass}
        >
          Next →
        </Link>
      ) : (
        <span
          className={cn(linkClass, 'opacity-40')}
          aria-disabled="true"
        >
          Next →
        </span>
      )}
    </nav>
  )
}

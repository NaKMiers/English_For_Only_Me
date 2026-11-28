import Link from 'next/link'

import { format } from '@/i18n/format'
import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'
import { cn } from '@/lib/utils'
import {
  buildBrowseHref,
  type BrowseQuery,
  type Pagination,
} from '@/modules/dictation/content/browseQuery'

const linkClass =
  'border-line bg-surface inline-flex min-h-11 items-center rounded-full border px-5 font-sans text-sm font-medium'

/** Prev/next pager (Link-based, URL-driven) preserving the active query. */
export function BrowsePagination({
  pagination,
  query,
  basePath,
  labels = en.dictation.browse,
}: {
  pagination: Pagination
  query: BrowseQuery
  basePath: string
  /** From the page's `getMessages()`: this stays a server component. */
  labels?: Messages['dictation']['browse']
}) {
  if (pagination.totalPages <= 1) return null

  function href(page: number) {
    return buildBrowseHref(basePath, query, page)
  }

  return (
    <nav
      aria-label={labels.pagination}
      className="flex items-center justify-between gap-3"
    >
      {pagination.hasPrev ? (
        <Link
          href={href(pagination.page - 1)}
          className={cn(linkClass, 'soft-press hover-pop hover:bg-tint-soft')}
        >
          {labels.prev}
        </Link>
      ) : (
        <span
          className={cn(linkClass, 'opacity-40')}
          aria-disabled="true"
        >
          {labels.prev}
        </span>
      )}
      <span className="text-ink-soft font-sans text-sm font-normal">
        {format(labels.page, {
          page: pagination.page,
          total: pagination.totalPages,
        })}
      </span>
      {pagination.hasNext ? (
        <Link
          href={href(pagination.page + 1)}
          className={cn(linkClass, 'soft-press hover-pop hover:bg-tint-soft')}
        >
          {labels.next}
        </Link>
      ) : (
        <span
          className={cn(linkClass, 'opacity-40')}
          aria-disabled="true"
        >
          {labels.next}
        </span>
      )}
    </nav>
  )
}

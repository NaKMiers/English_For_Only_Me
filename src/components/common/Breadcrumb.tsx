import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  /** Omit on the current page (the last item). */
  href?: string
  label: string
}

interface Props {
  className?: string
  items: BreadcrumbItem[]
  /** Accessible name, `common.journey.breadcrumb`. */
  label: string
}

/** "IELTS > Book 18 > Test 2" wayfinding above a page title. */
export function Breadcrumb({ className, items, label }: Props) {
  return (
    <nav
      aria-label={label}
      className={cn('min-w-0', className)}
    >
      <ol className="text-ink-soft flex min-w-0 flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => (
          <li
            className="flex min-w-0 items-center gap-1"
            key={`${item.label}-${index}`}
          >
            {index > 0 ? (
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 shrink-0"
              />
            ) : null}
            {item.href ? (
              <Link
                className="soft-press hover-pop hover:text-ink rounded-tag truncate px-0.5"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current="page"
                className="truncate"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

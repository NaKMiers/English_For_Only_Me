import Link from 'next/link'

import type { Messages } from '@/i18n/messages'
import { en } from '@/i18n/messages/en'

/**
 * "All topics / <current>" wayfinding for topic + no-topic pages. A server
 * component: the page passes `labels` from `getMessages()`.
 */
export function BrowseBreadcrumb({
  current,
  labels = en.dictation.browse,
}: {
  current: string
  labels?: Messages['dictation']['browse']
}) {
  return (
    <nav
      aria-label={labels.breadcrumb}
      className="flex items-center gap-2 font-sans text-sm font-semibold"
    >
      <Link
        href="/dictation"
        className="text-brand hover:underline"
      >
        {labels.allTopics}
      </Link>
      <span
        aria-hidden="true"
        className="text-ink-soft"
      >
        /
      </span>
      <span className="text-ink-soft truncate">{current}</span>
    </nav>
  )
}

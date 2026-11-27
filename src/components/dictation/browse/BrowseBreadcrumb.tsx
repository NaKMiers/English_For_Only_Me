import Link from 'next/link'

/** "All topics / <current>" wayfinding for topic + no-topic pages. */
export function BrowseBreadcrumb({ current }: { current: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 font-sans text-sm font-semibold"
    >
      <Link
        href="/dictation"
        className="text-brand hover:underline"
      >
        All topics
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

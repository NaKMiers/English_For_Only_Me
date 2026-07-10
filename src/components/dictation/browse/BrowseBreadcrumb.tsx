import Link from 'next/link'

/** "All topics / <current>" wayfinding for topic + no-topic pages. */
export function BrowseBreadcrumb({ current }: { current: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 font-sans text-sm font-black"
    >
      <Link
        href="/dictation"
        className="text-manga-red hover:underline"
      >
        All topics
      </Link>
      <span
        aria-hidden="true"
        className="text-manga-ink-soft"
      >
        /
      </span>
      <span className="text-manga-ink-soft truncate">{current}</span>
    </nav>
  )
}

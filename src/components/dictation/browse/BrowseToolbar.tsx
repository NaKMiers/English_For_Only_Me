'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { DICTATION_LEVELS } from '@/modules/dictation/levels'

const controlClass =
  'border-manga-black border-2 bg-manga-white px-3 py-2 font-sans text-sm font-black'

/**
 * URL-driven browse toolbar: debounced live search (no OK button, per design
 * review) + level filter + sort. Writes to the query string so back/forward and
 * shareable links work; any change resets to page 1.
 */
export function BrowseToolbar({
  search: initialSearch,
  level,
  sort,
}: {
  search: string
  level: string | null
  sort: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)

  function commit(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes))
      if (value) params.set(key, value)
      else params.delete(key)

    params.delete('page') // any filter change returns to page 1
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Debounce free-text search; only write when it actually changed.
  useEffect(() => {
    const current = searchParams.get('search') ?? ''
    if (search === current) return

    const timer = setTimeout(() => commit({ search }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        aria-label="Search lessons"
        placeholder="Search"
        value={search}
        onChange={event => setSearch(event.target.value)}
        className={`${controlClass} min-w-40 flex-1`}
      />
      <select
        aria-label="Level"
        value={level ?? ''}
        onChange={event => commit({ level: event.target.value })}
        className={controlClass}
      >
        <option value="">All levels</option>
        {DICTATION_LEVELS.map(l => (
          <option
            key={l}
            value={l}
          >
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="Sort"
        value={sort}
        onChange={event => commit({ sort: event.target.value })}
        className={controlClass}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="title">Title A–Z</option>
      </select>
    </div>
  )
}

'use client'

import { SlidersHorizontal } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMessages } from '@/i18n/client'
import { DICTATION_LEVELS } from '@/modules/dictation/levels'

const controlClass =
  'border-line min-h-11 rounded-control border bg-surface px-3 py-2 font-sans text-sm'

/**
 * URL-driven browse toolbar: debounced live search (no OK button). The level
 * filter folds behind a small filter button next to the field and stays
 * open while a level is set. Writes to the query string so back/forward and
 * shareable links work; any change resets to page 1. The list always keeps
 * the course order, so there is no sort control.
 */
export function BrowseToolbar({
  search: initialSearch,
  level,
}: {
  search: string
  level: string | null
}) {
  const text = useMessages().dictation.browse
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(initialSearch)
  const [showLevel, setShowLevel] = useState(Boolean(level))

  function commit(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(changes))
      if (value) params.set(key, value)
      else params.delete(key)

    params.delete('page') // any filter change returns to page 1
    params.delete('sort') // the course order is the only order
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
      <Input
        type="search"
        aria-label={text.searchLabel}
        placeholder={text.search}
        value={search}
        onChange={event => setSearch(event.target.value)}
        className={`${controlClass} min-w-40 flex-1`}
      />
      {showLevel || level ? (
        <Select
          value={level ?? ''}
          onValueChange={value => commit({ level: value ?? '' })}
        >
          <SelectTrigger aria-label={text.level}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{text.allLevels}</SelectItem>
            {DICTATION_LEVELS.map(l => (
              <SelectItem
                key={l}
                value={l}
              >
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <IconButton
          label={text.level}
          onClick={() => setShowLevel(true)}
        >
          <SlidersHorizontal
            aria-hidden="true"
            className="size-4"
          />
        </IconButton>
      )}
    </div>
  )
}

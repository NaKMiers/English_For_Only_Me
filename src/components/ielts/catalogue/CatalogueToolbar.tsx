'use client'

import { ArrowDownUp, ListFilter, Search, X } from 'lucide-react'
import { Fragment } from 'react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import {
  CATALOGUE_SORT_LABELS,
  CATALOGUE_SORT_SHORT_LABELS,
  type CatalogueSort,
} from './catalogueFilters'

export interface CatalogueFilter {
  id: string
  label: string
  /** The first option is the "show everything" one. */
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

interface Props {
  filters: CatalogueFilter[]
  onQueryChange: (query: string) => void
  onSortChange: (sort: CatalogueSort) => void
  query: string
  sort: CatalogueSort
  sortOptions: CatalogueSort[]
  className?: string
}

const TRIGGER_CLASS_NAME =
  'border-manga-black bg-manga-white text-manga-black hover:bg-manga-paper-soft rounded-control inline-flex h-9 shrink-0 items-center gap-1.5 border-2 px-2.5 font-sans text-xs font-black shadow-[2px_2px_0_var(--manga-black)] transition-colors'

const GROUP_LABEL_CLASS_NAME =
  'text-manga-ink-soft px-3 pt-1 font-sans text-[0.65rem] font-black uppercase'

const RADIO_ITEM_CLASS_NAME =
  'focus:bg-manga-paper-soft data-checked:bg-manga-paper-soft min-h-9 rounded-tag py-1 pr-8 pl-3 font-sans text-xs font-black'

/**
 * Search, sort and filter on one 36px row: the search box takes the spare
 * width, sort and filter fold into menus so their options cost no space until
 * opened. The filter button counts the filters that are narrowing the list.
 */
export function CatalogueToolbar({
  className,
  filters,
  onQueryChange,
  onSortChange,
  query,
  sort,
  sortOptions,
}: Props) {
  const activeFilters = filters.filter(
    filter => filter.value !== filter.options[0]?.value
  )

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden="true"
          className="text-manga-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Search tests"
          className="border-manga-black bg-manga-white h-9 border-2 pr-8 pl-8 font-semibold"
          onChange={event => onQueryChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') onQueryChange('')
          }}
          placeholder="Search tests"
          type="search"
          value={query}
        />
        {/* Raw button: a 28px glyph inside the input, which IconButton's
            44px sticker frame cannot fit. */}
        {query ? (
          <button
            aria-label="Clear search"
            className="hover:bg-manga-paper-soft rounded-tag absolute top-1/2 right-1 grid size-7 -translate-y-1/2 place-items-center"
            onClick={() => onQueryChange('')}
            type="button"
          >
            <X
              aria-hidden="true"
              className="size-4"
            />
          </button>
        ) : null}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Sort: ${CATALOGUE_SORT_LABELS[sort]}`}
          className={TRIGGER_CLASS_NAME}
          title={`Sort: ${CATALOGUE_SORT_LABELS[sort]}`}
        >
          <ArrowDownUp
            aria-hidden="true"
            className="size-4"
          />
          <span className="hidden sm:inline">
            {CATALOGUE_SORT_SHORT_LABELS[sort]}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48"
        >
          <DropdownMenuRadioGroup
            onValueChange={value => onSortChange(value as CatalogueSort)}
            value={sort}
          >
            <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
              Sort by
            </DropdownMenuLabel>
            {sortOptions.map(option => (
              <DropdownMenuRadioItem
                className={RADIO_ITEM_CLASS_NAME}
                key={option}
                value={option}
              >
                {CATALOGUE_SORT_LABELS[option]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {filters.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={
              activeFilters.length
                ? `Filters, ${activeFilters.length} on`
                : 'Filters'
            }
            className={cn(
              TRIGGER_CLASS_NAME,
              activeFilters.length && 'bg-manga-pale-red'
            )}
            title="Filters"
          >
            <ListFilter
              aria-hidden="true"
              className="size-4"
            />
            <span className="hidden sm:inline">Filter</span>
            {activeFilters.length ? (
              <span className="rounded-tag bg-manga-black text-manga-white min-w-5 px-1 text-center text-[0.65rem] tabular-nums">
                {activeFilters.length}
              </span>
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52"
          >
            {filters.map((filter, index) => (
              <Fragment key={filter.id}>
                {index ? <DropdownMenuSeparator /> : null}
                {/* The label sits inside its group: Menu.GroupLabel reads
                    the group context and throws as a sibling. */}
                <DropdownMenuRadioGroup
                  onValueChange={value => filter.onChange(String(value))}
                  value={filter.value}
                >
                  <DropdownMenuLabel className={GROUP_LABEL_CLASS_NAME}>
                    {filter.label}
                  </DropdownMenuLabel>
                  {filter.options.map(option => (
                    <DropdownMenuRadioItem
                      className={RADIO_ITEM_CLASS_NAME}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </Fragment>
            ))}
            {activeFilters.length ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-manga-red min-h-9 px-3 font-sans text-xs font-black"
                  onClick={() =>
                    activeFilters.forEach(filter =>
                      filter.onChange(filter.options[0].value)
                    )
                  }
                >
                  Clear filters
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

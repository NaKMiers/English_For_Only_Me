'use client'

import {
  ArrowDownUp,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, plural } from '@/i18n/format'
import { useMessages } from '@/i18n/client'
import { cn } from '@/lib/utils'
import {
  ADMIN_FILTER_NONE,
  ADMIN_LEVEL_OPTIONS,
  ADMIN_QUICK_VIEWS,
  ADMIN_VIDEO_SORTS,
  ADMIN_VIDEO_STATUSES,
  type AdminVideoFacetCounts,
  type AdminVideoFilter,
  type AdminVideoSort,
  countActiveAdminFilters,
  EMPTY_ADMIN_VIDEO_FILTER,
} from '@/modules/dictation/content/adminVideoFilter'
import type { DictationVideoStatus } from '@/modules/dictation/types'

interface Props {
  counts: AdminVideoFacetCounts
  filter: AdminVideoFilter
  onChange: (filter: AdminVideoFilter) => void
  sections: Array<{ id: string; topicId: string; title: string }>
  shown: number
  topics: Array<{ id: string; title: string }>
  total: number
}

function toggle<T extends string>(list: T[], value: T) {
  return list.includes(value)
    ? list.filter(item => item !== value)
    : [...list, value]
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every(item => b.includes(item))
}

/** A multi-select option with its count; dims when it would show nothing. */
function FacetChip({
  count,
  label,
  onClick,
  pressed,
}: {
  count?: number
  label: string
  onClick: () => void
  pressed: boolean
}) {
  const t = useMessages()

  return (
    // Segmented toggle (aria-pressed): documented raw exception.
    <button
      aria-label={
        count === undefined
          ? undefined
          : format(t.admin.filters.optionCount, { label, count })
      }
      aria-pressed={pressed}
      className={cn(
        'border-line rounded-tag soft-press inline-flex min-h-8 items-center gap-1.5 border px-2.5 font-sans text-xs font-semibold',
        pressed
          ? 'bg-ink text-surface translate-x-[2px] translate-y-[2px]'
          : 'bg-surface hover:bg-tint-soft',
        !pressed && count === 0 && 'opacity-45'
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      {count === undefined ? null : (
        <span
          className={cn(
            'tabular-nums',
            pressed ? 'text-surface/70' : 'text-ink-soft'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}

function FacetGroup({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div
      aria-label={label}
      className="grid gap-1.5"
      role="group"
    >
      <span className="text-ink-soft font-sans text-xs font-normal">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

/**
 * Search, a collapsible facet panel (quick views, level, status, topic and
 * section, each option with the count it would show) and a sort menu. Every
 * active filter shows as a removable chip under the bar.
 */
export function VideoFilterBar({
  counts,
  filter,
  onChange,
  sections,
  shown,
  topics,
  total,
}: Props) {
  const t = useMessages()
  const f = t.admin.filters
  const [open, setOpen] = useState(false)
  const active = countActiveAdminFilters(filter)
  const facetsActive = active - Number(Boolean(filter.search.trim()))
  const patch = (next: Partial<AdminVideoFilter>) =>
    onChange({ ...filter, ...next })

  const pickedTopic =
    filter.topicId && filter.topicId !== ADMIN_FILTER_NONE ? filter.topicId : ''
  const topicSections = sections.filter(
    section => section.topicId === pickedTopic
  )
  const levelLabel = (level: string) =>
    level === ADMIN_FILTER_NONE ? f.noLevel : level
  const withCount = (label: string, count: number | undefined) =>
    format(f.optionCount, { label, count: count ?? 0 })
  const quickViewLabels: Record<string, string> = {
    unfiled: f.quickUnfiled,
    'no-level': f.quickNoLevel,
    'not-ready': f.quickNotReady,
  }
  const topicItems = [
    { value: '', label: f.anyTopic },
    {
      value: ADMIN_FILTER_NONE,
      label: withCount(f.noTopic, counts.topics[ADMIN_FILTER_NONE]),
    },
    ...topics.map(topic => ({
      value: topic.id,
      label: withCount(topic.title, counts.topics[topic.id]),
    })),
  ]
  const sectionItems = [
    { value: '', label: f.anySection },
    {
      value: ADMIN_FILTER_NONE,
      label: withCount(f.noSection, counts.sections[ADMIN_FILTER_NONE]),
    },
    ...topicSections.map(section => ({
      value: section.id,
      label: withCount(section.title, counts.sections[section.id]),
    })),
  ]
  const sortItems = ADMIN_VIDEO_SORTS.map(sort => ({
    value: sort.value,
    label: f.sorts[sort.value],
  }))
  // Statuses nobody has stay out of the way unless picked.
  const statuses = ADMIN_VIDEO_STATUSES.filter(
    status => counts.statuses[status] || filter.statuses.includes(status)
  )

  const topicTitle = (id: string) =>
    id === ADMIN_FILTER_NONE
      ? f.noTopic
      : (topics.find(topic => topic.id === id)?.title ?? f.unknownTopic)
  const sectionTitle = (id: string) =>
    id === ADMIN_FILTER_NONE
      ? f.noSection
      : (sections.find(section => section.id === id)?.title ?? f.unknownSection)

  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...(filter.search.trim()
      ? [
          {
            key: 'search',
            label: format(f.searchChip, { text: filter.search.trim() }),
            remove: () => patch({ search: '' }),
          },
        ]
      : []),
    ...filter.levels.map(level => ({
      key: `level:${level}`,
      label: levelLabel(level),
      remove: () => patch({ levels: toggle(filter.levels, level) }),
    })),
    ...filter.statuses.map(status => ({
      key: `status:${status}`,
      label: t.admin.status[status],
      remove: () => patch({ statuses: toggle(filter.statuses, status) }),
    })),
    ...(filter.topicId
      ? [
          {
            key: 'topic',
            label: topicTitle(filter.topicId),
            remove: () => patch({ topicId: '', sectionId: '' }),
          },
        ]
      : []),
    ...(filter.sectionId
      ? [
          {
            key: 'section',
            label: sectionTitle(filter.sectionId),
            remove: () => patch({ sectionId: '' }),
          },
        ]
      : []),
  ]

  return (
    <Collapsible
      className="grid gap-2"
      onOpenChange={setOpen}
      open={open}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            aria-hidden="true"
            className="text-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            aria-label={f.search}
            className="border-line bg-surface min-h-10 border pr-9 pl-8 font-sans text-sm font-semibold [&::-webkit-search-cancel-button]:appearance-none"
            onChange={event => patch({ search: event.target.value })}
            placeholder={f.searchPlaceholder}
            type="search"
            value={filter.search}
          />
          {filter.search ? (
            <Button
              aria-label={f.clearSearch}
              className="absolute top-1/2 right-1 -translate-y-1/2"
              onClick={() => patch({ search: '' })}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        <div className="flex gap-2 max-sm:w-full">
          <CollapsibleTrigger
            aria-label={
              facetsActive
                ? format(f.filtersActive, { count: facetsActive })
                : f.filters
            }
            className={cn(
              'group/filters border-line rounded-control soft-press inline-flex min-h-10 items-center gap-1.5 border px-3 font-sans text-sm font-semibold max-sm:flex-1 max-sm:justify-center',
              facetsActive ? 'bg-ink text-surface' : 'bg-surface hover:bg-tint'
            )}
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="size-4"
            />
            {f.filters}
            {facetsActive ? (
              <span className="bg-brand text-surface rounded-tag grid min-w-5 place-items-center px-1 text-xs tabular-nums">
                {facetsActive}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[panel-open]/filters:rotate-180"
            />
          </CollapsibleTrigger>
          <Select
            items={sortItems}
            onValueChange={value =>
              patch({ sort: (value ?? 'order') as AdminVideoSort })
            }
            value={filter.sort}
          >
            <SelectTrigger
              aria-label={f.sortVideos}
              className="min-h-10 max-sm:flex-1"
            >
              <ArrowDownUp
                aria-hidden="true"
                className="size-4"
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortItems.map(sort => (
                <SelectItem
                  key={sort.value}
                  value={sort.value}
                >
                  {sort.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CollapsiblePanel>
        <div className="border-line bg-tint rounded-panel grid gap-3 border p-3">
          <FacetGroup label={f.quickViews}>
            {ADMIN_QUICK_VIEWS.map(view => {
              const on =
                sameSet(filter.levels, view.filter.levels) &&
                sameSet(filter.statuses, view.filter.statuses) &&
                filter.topicId === view.filter.topicId &&
                !filter.sectionId

              return (
                <FacetChip
                  key={view.key}
                  label={quickViewLabels[view.key] ?? view.label}
                  onClick={() =>
                    patch(
                      on
                        ? {
                            levels: [],
                            statuses: [],
                            topicId: '',
                            sectionId: '',
                          }
                        : { ...view.filter, sectionId: '' }
                    )
                  }
                  pressed={on}
                />
              )
            })}
          </FacetGroup>
          <FacetGroup label={f.level}>
            {ADMIN_LEVEL_OPTIONS.map(level => (
              <FacetChip
                count={counts.levels[level] ?? 0}
                key={level}
                label={levelLabel(level)}
                onClick={() => patch({ levels: toggle(filter.levels, level) })}
                pressed={filter.levels.includes(level)}
              />
            ))}
          </FacetGroup>
          <FacetGroup label={f.status}>
            {statuses.map(status => (
              <FacetChip
                count={counts.statuses[status] ?? 0}
                key={status}
                label={t.admin.status[status]}
                onClick={() =>
                  patch({
                    statuses: toggle<DictationVideoStatus>(
                      filter.statuses,
                      status
                    ),
                  })
                }
                pressed={filter.statuses.includes(status)}
              />
            ))}
          </FacetGroup>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              items={topicItems}
              onValueChange={value =>
                patch({ topicId: value ?? '', sectionId: '' })
              }
              value={filter.topicId}
            >
              <SelectTrigger
                aria-label={f.filterByTopic}
                className="w-full"
                size="sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {topicItems.map(item => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              disabled={!pickedTopic}
              items={sectionItems}
              onValueChange={value => patch({ sectionId: value ?? '' })}
              value={filter.sectionId}
            >
              <SelectTrigger
                aria-label={f.filterBySection}
                className="w-full"
                size="sm"
                title={pickedTopic ? undefined : f.pickTopicFirst}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionItems.map(item => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsiblePanel>

      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map(chip => (
          <Button
            aria-label={format(f.removeFilter, { label: chip.label })}
            className="border-line bg-surface hover:bg-tint-soft rounded-tag h-7 max-w-full gap-1 border px-2 font-sans text-xs font-semibold"
            key={chip.key}
            onClick={chip.remove}
            type="button"
            variant="outline"
          >
            <span className="truncate">{chip.label}</span>
            <X aria-hidden="true" />
          </Button>
        ))}
        {chips.length > 1 ? (
          <Button
            className="text-brand h-7 px-1.5 font-sans text-xs font-semibold underline-offset-2 hover:underline"
            onClick={() =>
              onChange({ ...EMPTY_ADMIN_VIDEO_FILTER, sort: filter.sort })
            }
            type="button"
            variant="link"
          >
            {f.clearAll}
          </Button>
        ) : null}
        <span
          aria-live="polite"
          className="text-ink-soft ml-auto text-xs font-normal tabular-nums"
        >
          {shown === total
            ? plural(f.total, total)
            : format(f.shownOf, { shown, total })}
        </span>
      </div>
    </Collapsible>
  )
}

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
import { getDictationStatusLabel } from '@/modules/dictation/statusDisplay'
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

const levelLabel = (level: string) =>
  level === ADMIN_FILTER_NONE ? 'No level' : level

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
  return (
    // Segmented toggle (aria-pressed): documented raw exception.
    <button
      aria-label={count === undefined ? undefined : `${label} (${count})`}
      aria-pressed={pressed}
      className={cn(
        'border-manga-black rounded-tag sticker-press inline-flex min-h-8 items-center gap-1.5 border-2 px-2.5 font-sans text-xs font-black',
        pressed
          ? 'bg-manga-black text-manga-white translate-x-[2px] translate-y-[2px]'
          : 'bg-manga-white hover:bg-manga-pale-red shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
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
            pressed ? 'text-manga-white/70' : 'text-manga-ink-soft'
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
      <span className="text-manga-ink-soft font-sans text-xs font-black uppercase">
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
  const topicItems = [
    { value: '', label: 'Any topic' },
    {
      value: ADMIN_FILTER_NONE,
      label: `No topic (${counts.topics[ADMIN_FILTER_NONE] ?? 0})`,
    },
    ...topics.map(topic => ({
      value: topic.id,
      label: `${topic.title} (${counts.topics[topic.id] ?? 0})`,
    })),
  ]
  const sectionItems = [
    { value: '', label: 'Any section' },
    {
      value: ADMIN_FILTER_NONE,
      label: `No section (${counts.sections[ADMIN_FILTER_NONE] ?? 0})`,
    },
    ...topicSections.map(section => ({
      value: section.id,
      label: `${section.title} (${counts.sections[section.id] ?? 0})`,
    })),
  ]
  // Statuses nobody has stay out of the way unless picked.
  const statuses = ADMIN_VIDEO_STATUSES.filter(
    status => counts.statuses[status] || filter.statuses.includes(status)
  )

  const topicTitle = (id: string) =>
    id === ADMIN_FILTER_NONE
      ? 'No topic'
      : (topics.find(topic => topic.id === id)?.title ?? 'Unknown topic')
  const sectionTitle = (id: string) =>
    id === ADMIN_FILTER_NONE
      ? 'No section'
      : (sections.find(section => section.id === id)?.title ??
        'Unknown section')

  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...(filter.search.trim()
      ? [
          {
            key: 'search',
            label: `“${filter.search.trim()}”`,
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
      label: getDictationStatusLabel(status),
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
            className="text-manga-ink-soft pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            aria-label="Search videos"
            className="border-manga-black bg-manga-white min-h-10 border-2 pr-9 pl-8 font-sans text-sm font-black"
            onChange={event => patch({ search: event.target.value })}
            placeholder="Search title, channel, topic…"
            type="search"
            value={filter.search}
          />
          {filter.search ? (
            <Button
              aria-label="Clear search"
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
              facetsActive ? `Filters, ${facetsActive} active` : 'Filters'
            }
            className={cn(
              'group/filters border-manga-black rounded-control sticker-press inline-flex min-h-10 items-center gap-1.5 border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none max-sm:flex-1 max-sm:justify-center',
              facetsActive
                ? 'bg-manga-black text-manga-white'
                : 'bg-manga-white hover:bg-manga-paper-soft'
            )}
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="size-4"
            />
            Filters
            {facetsActive ? (
              <span className="bg-manga-red text-manga-white rounded-tag grid min-w-5 place-items-center px-1 text-xs tabular-nums">
                {facetsActive}
              </span>
            ) : null}
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-data-[panel-open]/filters:rotate-180"
            />
          </CollapsibleTrigger>
          <Select
            items={ADMIN_VIDEO_SORTS}
            onValueChange={value =>
              patch({ sort: (value ?? 'order') as AdminVideoSort })
            }
            value={filter.sort}
          >
            <SelectTrigger
              aria-label="Sort videos"
              className="min-h-10 max-sm:flex-1"
            >
              <ArrowDownUp
                aria-hidden="true"
                className="size-4"
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_VIDEO_SORTS.map(sort => (
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
        <div className="border-manga-black bg-manga-paper-soft rounded-panel grid gap-3 border-2 p-3">
          <FacetGroup label="Quick views">
            {ADMIN_QUICK_VIEWS.map(view => {
              const on =
                sameSet(filter.levels, view.filter.levels) &&
                sameSet(filter.statuses, view.filter.statuses) &&
                filter.topicId === view.filter.topicId &&
                !filter.sectionId

              return (
                <FacetChip
                  key={view.key}
                  label={view.label}
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
          <FacetGroup label="Level">
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
          <FacetGroup label="Status">
            {statuses.map(status => (
              <FacetChip
                count={counts.statuses[status] ?? 0}
                key={status}
                label={getDictationStatusLabel(status)}
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
                aria-label="Filter by topic"
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
                aria-label="Filter by section"
                className="w-full"
                size="sm"
                title={pickedTopic ? undefined : 'Pick a topic first'}
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
            aria-label={`Remove filter ${chip.label}`}
            className="border-manga-black bg-manga-white hover:bg-manga-pale-red rounded-tag h-7 max-w-full gap-1 border-2 px-2 font-sans text-xs font-black"
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
            className="text-manga-red h-7 px-1.5 font-sans text-xs font-black underline-offset-2 hover:underline"
            onClick={() =>
              onChange({ ...EMPTY_ADMIN_VIDEO_FILTER, sort: filter.sort })
            }
            type="button"
            variant="link"
          >
            Clear all
          </Button>
        ) : null}
        <span
          aria-live="polite"
          className="text-manga-ink-soft ml-auto text-xs font-black tabular-nums"
        >
          {shown === total ? `${total} videos` : `${shown} of ${total} videos`}
        </span>
      </div>
    </Collapsible>
  )
}

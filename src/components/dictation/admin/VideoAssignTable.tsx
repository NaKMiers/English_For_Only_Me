'use client'

import { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  assignVideosAction,
  reorderVideosAction,
} from '@/modules/dictation/content/adminActions'
import {
  type AdminVideoFilter,
  countAdminVideoFacets,
  filterAdminVideos,
  writeAdminVideoFilter,
} from '@/modules/dictation/content/adminVideoFilter'
import type { DictationLevel } from '@/modules/dictation/levels'
import { DICTATION_LEVELS } from '@/modules/dictation/levels'
import type { DictationVideoStatus } from '@/modules/dictation/types'

import { AdminVideoRow } from './AdminVideoRow'
import { VideoFilterBar } from './VideoFilterBar'

export interface AdminVideoRow {
  id: string
  title: string
  channelTitle: string | null
  level: string | null
  topicId: string | null
  topicTitle: string | null
  sectionId: string | null
  sectionTitle: string | null
  status: DictationVideoStatus
  /** Epoch milliseconds. */
  createdAt: number
  durationSeconds: number | null
  thumbnailUrl: string | null
  youtubeVideoId: string | null
  order: number
}

interface Props {
  /** Read from the URL by the page, so the first render is already filtered. */
  initialFilter: AdminVideoFilter
  videos: AdminVideoRow[]
  topics: Array<{ id: string; title: string }>
  sections: Array<{ id: string; topicId: string; title: string }>
}

const LEVEL_ITEMS = [
  { value: '', label: 'No level' },
  ...DICTATION_LEVELS.map(level => ({ value: level, label: level })),
]
const VIDEO_ORDER_MIME = 'application/x-efom-admin-video-order'

/**
 * The assign and reorder actions revalidate this page, so their responses carry
 * the fresh rows; there is no client router.refresh() after them.
 */
export function VideoAssignTable({
  initialFilter,
  videos,
  topics,
  sections,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [topicId, setTopicId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [level, setLevel] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [orderedVideoIds, setOrderedVideoIds] = useState(() =>
    videos.map(video => video.id)
  )

  const orderedVideos = useMemo(() => {
    const byId = new Map(videos.map(video => [video.id, video]))
    const ordered = orderedVideoIds.flatMap(id => {
      const video = byId.get(id)
      return video ? [video] : []
    })
    const orderedSet = new Set(ordered.map(video => video.id))
    const missing = videos.filter(video => !orderedSet.has(video.id))

    return [...ordered, ...missing]
  }, [videos, orderedVideoIds])

  const topicSections = useMemo(
    () => sections.filter(s => s.topicId === topicId),
    [sections, topicId]
  )
  const topicItems = useMemo(
    () => [
      { value: '', label: 'No topic' },
      ...topics.map(topic => ({ value: topic.id, label: topic.title })),
    ],
    [topics]
  )
  const sectionItems = useMemo(
    () => [
      { value: '', label: 'No section' },
      ...topicSections.map(section => ({
        value: section.id,
        label: section.title,
      })),
    ],
    [topicSections]
  )

  const visibleVideos = useMemo(
    () => filterAdminVideos(orderedVideos, filter),
    [orderedVideos, filter]
  )
  const facetCounts = useMemo(
    () => countAdminVideoFacets(videos, filter),
    [videos, filter]
  )
  const visibleIds = visibleVideos.map(video => video.id)
  const selectedShown = visibleIds.filter(id => selected.has(id)).length
  const selectedHidden = selected.size - selectedShown
  // Dragging only means something in the saved (custom) order.
  const canReorder = filter.sort === 'order'

  function changeFilter(next: AdminVideoFilter) {
    setFilter(next)

    // Native history keeps the filter in the URL without a server round trip.
    const params = writeAdminVideoFilter(
      new URLSearchParams(window.location.search),
      next
    )
    const query = params.toString()

    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`
    )
  }

  function toggleAllShown(checked: boolean) {
    setSelected(prev => {
      const next = new Set(prev)
      for (const id of visibleIds)
        if (checked) next.add(id)
        else next.delete(id)
      return next
    })
  }

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function apply() {
    if (selected.size === 0) return

    startTransition(async () => {
      await assignVideosAction({
        videoIds: [...selected],
        topicId: topicId || null,
        sectionId: sectionId || null,
        level: (level || null) as DictationLevel | null,
      })
      setSelected(new Set())
    })
  }

  function reorder(
    draggedId: string,
    targetId: string,
    placement: 'before' | 'after'
  ) {
    if (draggedId === targetId) return

    const current = orderedVideos.map(video => video.id)
    const without = current.filter(id => id !== draggedId)
    const targetIndex = without.indexOf(targetId)
    if (targetIndex === -1) return

    const insertIndex = placement === 'after' ? targetIndex + 1 : targetIndex
    const next = [...without]
    next.splice(insertIndex, 0, draggedId)
    setOrderedVideoIds(next)

    startTransition(async () => {
      await reorderVideosAction(next)
    })
  }

  return (
    <div className="grid gap-3">
      <VideoFilterBar
        counts={facetCounts}
        filter={filter}
        onChange={changeFilter}
        sections={sections}
        shown={visibleVideos.length}
        topics={topics}
        total={videos.length}
      />

      <div
        className={cn(
          'border-manga-black rounded-panel grid gap-2 border-2 px-3 py-2',
          selected.size ? 'bg-manga-pale-red' : 'bg-manga-paper-soft'
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Label className="flex min-h-9 cursor-pointer items-center gap-2 font-sans text-sm font-black">
            <Checkbox
              checked={selectedShown > 0 && selectedShown === visibleIds.length}
              disabled={visibleIds.length === 0}
              indeterminate={
                selectedShown > 0 && selectedShown < visibleIds.length
              }
              onCheckedChange={checked => toggleAllShown(checked)}
            />
            {selected.size
              ? `${selected.size} selected`
              : `Select all ${visibleIds.length} shown`}
          </Label>
          {selectedHidden ? (
            <span className="text-manga-ink-soft text-xs font-black">
              ({selectedHidden} hidden by filters)
            </span>
          ) : null}
          {selected.size ? (
            <Button
              className="text-manga-red ml-auto h-7 px-1 font-sans text-xs font-black"
              onClick={() => setSelected(new Set())}
              type="button"
              variant="link"
            >
              Clear selection
            </Button>
          ) : (
            <span className="text-manga-ink-soft text-xs font-semibold">
              Then set topic, section and level together.
            </span>
          )}
        </div>

        {selected.size ? (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={topicId}
              items={topicItems}
              onValueChange={value => {
                setTopicId(value ?? '')
                setSectionId('')
              }}
            >
              <SelectTrigger
                size="sm"
                aria-label="Topic"
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
              value={sectionId}
              items={sectionItems}
              onValueChange={value => setSectionId(value ?? '')}
              disabled={!topicId}
            >
              <SelectTrigger
                size="sm"
                aria-label="Section"
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
            <Select
              value={level}
              items={LEVEL_ITEMS}
              onValueChange={value => setLevel(value ?? '')}
            >
              <SelectTrigger
                size="sm"
                aria-label="Level"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_ITEMS.map(item => (
                  <SelectItem
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <MangaButton
              type="button"
              tone="ink"
              onClick={apply}
              disabled={pending}
              className="min-h-9 border-2 shadow-[2px_2px_0_var(--manga-black)] max-sm:flex-1"
            >
              {pending ? 'Applying…' : `Apply to ${selected.size}`}
            </MangaButton>
          </div>
        ) : null}
      </div>

      {canReorder ? null : (
        <p className="text-manga-ink-soft text-xs font-semibold">
          Drag to reorder works in Custom order.
        </p>
      )}

      <ul className="grid gap-1">
        {visibleVideos.length === 0 ? (
          <li className="border-manga-black/40 rounded-control grid justify-items-center gap-2 border-2 border-dashed p-6 text-center">
            <span className="text-manga-ink-soft text-sm font-semibold">
              No videos match these filters.
            </span>
          </li>
        ) : (
          visibleVideos.map(video => (
            <AdminVideoRow
              key={video.id}
              video={video}
              gripLabel={`Reorder ${video.title}`}
              acceptReorderMime={VIDEO_ORDER_MIME}
              onDragStartData={dataTransfer =>
                dataTransfer.setData(VIDEO_ORDER_MIME, video.id)
              }
              onReorder={(draggedId, targetId, placement) => {
                if (!canReorder) return false
                reorder(draggedId, targetId, placement)
                return true
              }}
              selectable
              selected={selected.has(video.id)}
              onToggleSelect={() => toggle(video.id)}
              meta={
                <span className="text-manga-ink-soft hidden shrink-0 text-xs font-black sm:block">
                  {video.topicTitle ?? 'No topic'}
                  {video.sectionTitle ? ` · ${video.sectionTitle}` : ''}
                </span>
              }
            />
          ))
        )}
      </ul>
    </div>
  )
}

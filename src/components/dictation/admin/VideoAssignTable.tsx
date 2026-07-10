'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { Input } from '@/components/ui/input'
import { MangaButton } from '@/components/ui/MangaButton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DICTATION_LEVELS } from '@/modules/dictation/levels'
import type { DictationLevel } from '@/modules/dictation/levels'
import {
  assignVideosAction,
  deleteVideoAction,
  reorderVideosAction,
} from '@/modules/dictation/content/adminActions'
import { matchesBrowseQuery } from '@/modules/dictation/content/browseQuery'
import type { DictationVideoStatus } from '@/modules/dictation/types'

import { AdminVideoRow } from './AdminVideoRow'
import { ConfirmSubmitButton } from './ConfirmSubmitButton'

export interface AdminVideoRow {
  id: string
  title: string
  level: string | null
  topicTitle: string | null
  sectionTitle: string | null
  status: DictationVideoStatus
  thumbnailUrl: string | null
  youtubeVideoId: string | null
  order: number
}

interface Props {
  videos: AdminVideoRow[]
  topics: Array<{ id: string; title: string }>
  sections: Array<{ id: string; topicId: string; title: string }>
}

const controlClass =
  'border-manga-black min-h-9 rounded-none border-2 bg-manga-white px-2 py-1 text-sm font-black'
const VIDEO_ORDER_MIME = 'application/x-efom-admin-video-order'

export function VideoAssignTable({ videos, topics, sections }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [topicId, setTopicId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [level, setLevel] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
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

  const visibleVideos = useMemo(
    () =>
      orderedVideos.filter(video =>
        matchesBrowseQuery(
          { title: video.title, level: video.level as DictationLevel | null },
          {
            search: filterSearch,
            level: (filterLevel || null) as DictationLevel | null,
            sort: 'order',
            page: 1,
          }
        )
      ),
    [orderedVideos, filterSearch, filterLevel]
  )

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
      router.refresh()
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
      router.refresh()
    })
  }

  return (
    <div className="grid gap-3">
      <div className="border-manga-black bg-manga-paper-soft flex flex-wrap items-center gap-2 border-3 p-3">
        <span className="font-sans text-sm font-black">
          {selected.size} selected →
        </span>
        <Select
          value={topicId}
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
            <SelectItem value="">No topic</SelectItem>
            {topics.map(t => (
              <SelectItem
                key={t.id}
                value={t.id}
              >
                {t.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={sectionId}
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
            <SelectItem value="">No section</SelectItem>
            {topicSections.map(s => (
              <SelectItem
                key={s.id}
                value={s.id}
              >
                {s.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={level}
          onValueChange={value => setLevel(value ?? '')}
        >
          <SelectTrigger
            size="sm"
            aria-label="Level"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No level</SelectItem>
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
        <MangaButton
          type="button"
          tone="paper"
          onClick={apply}
          disabled={selected.size === 0 || pending}
          className="min-h-9 border-2 shadow-[2px_2px_0_var(--manga-black)]"
        >
          {pending ? 'Assigning…' : 'Assign selected'}
        </MangaButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          aria-label="Filter videos"
          placeholder="Filter by title"
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          className={`${controlClass} min-w-40 flex-1`}
        />
        <Select
          value={filterLevel}
          onValueChange={value => setFilterLevel(value ?? '')}
        >
          <SelectTrigger
            size="sm"
            aria-label="Filter level"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All levels</SelectItem>
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
        <span className="text-manga-ink-soft text-xs font-black">
          {visibleVideos.length}/{videos.length}
        </span>
      </div>

      <ul className="grid gap-1">
        {visibleVideos.length === 0 ? (
          <li className="text-manga-ink-soft text-sm">No videos match.</li>
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
              actions={
                <form
                  action={deleteVideoAction}
                  onClick={event => event.stopPropagation()}
                  onKeyDown={event => event.stopPropagation()}
                  className="shrink-0"
                >
                  <input
                    type="hidden"
                    name="id"
                    value={video.id}
                  />
                  <ConfirmSubmitButton
                    confirmTitle="Delete video?"
                    confirmMessage={`Delete "${video.title}"? This archives the video and removes it from admin and app lists.`}
                    confirmLabel="Delete video"
                    className="border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-xs font-black uppercase shadow-[2px_2px_0_var(--manga-black)]"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              }
            />
          ))
        )}
      </ul>
    </div>
  )
}

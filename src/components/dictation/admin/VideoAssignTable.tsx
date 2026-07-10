'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'

import { DICTATION_LEVELS } from '@/modules/dictation/levels'
import type { DictationLevel } from '@/modules/dictation/levels'
import { assignVideosAction } from '@/modules/dictation/content/adminActions'

export interface AdminVideoRow {
  id: string
  title: string
  level: string | null
  topicTitle: string | null
  sectionTitle: string | null
}

interface Props {
  videos: AdminVideoRow[]
  topics: Array<{ id: string; title: string }>
  sections: Array<{ id: string; topicId: string; title: string }>
}

const controlClass =
  'border-manga-black border-2 bg-manga-white px-2 py-1 text-sm font-black'

export function VideoAssignTable({ videos, topics, sections }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [topicId, setTopicId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [level, setLevel] = useState('')

  const topicSections = useMemo(
    () => sections.filter(s => s.topicId === topicId),
    [sections, topicId]
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

  return (
    <div className="grid gap-3">
      <div className="border-manga-black bg-manga-paper-soft flex flex-wrap items-center gap-2 border-3 p-3">
        <span className="font-sans text-sm font-black">
          {selected.size} selected →
        </span>
        <select
          aria-label="Topic"
          value={topicId}
          onChange={e => {
            setTopicId(e.target.value)
            setSectionId('')
          }}
          className={controlClass}
        >
          <option value="">No topic</option>
          {topics.map(t => (
            <option
              key={t.id}
              value={t.id}
            >
              {t.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Section"
          value={sectionId}
          onChange={e => setSectionId(e.target.value)}
          disabled={!topicId}
          className={controlClass}
        >
          <option value="">No section</option>
          {topicSections.map(s => (
            <option
              key={s.id}
              value={s.id}
            >
              {s.title}
            </option>
          ))}
        </select>
        <select
          aria-label="Level"
          value={level}
          onChange={e => setLevel(e.target.value)}
          className={controlClass}
        >
          <option value="">No level</option>
          {DICTATION_LEVELS.map(l => (
            <option
              key={l}
              value={l}
            >
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={apply}
          disabled={selected.size === 0 || pending}
          className="border-manga-black bg-manga-white hover:bg-manga-pale-red inline-flex min-h-9 items-center border-2 px-3 font-sans text-sm font-black shadow-[2px_2px_0_var(--manga-black)] disabled:opacity-50"
        >
          {pending ? 'Assigning…' : 'Assign selected'}
        </button>
      </div>

      <ul className="grid gap-1">
        {videos.length === 0 ? (
          <li className="text-manga-ink-soft text-sm">No videos.</li>
        ) : (
          videos.map(video => (
            <li
              key={video.id}
              className="border-manga-black bg-manga-white flex items-center gap-3 border-2 p-2"
            >
              <input
                type="checkbox"
                aria-label={`Select ${video.title}`}
                checked={selected.has(video.id)}
                onChange={() => toggle(video.id)}
                className="size-4 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate font-sans text-sm font-black">
                {video.title}
              </span>
              <span className="text-manga-ink-soft shrink-0 text-xs font-black">
                {video.topicTitle ?? 'No topic'}
                {video.sectionTitle ? ` · ${video.sectionTitle}` : ''}
                {video.level ? ` · ${video.level}` : ''}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

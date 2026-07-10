'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { reorderTopicsAction } from '@/modules/dictation/content/adminActions'

import { AdminTopicCard, type AdminTopicData } from './AdminTopicCard'
import { DropZone, MIME_TOPIC, reorderIds } from './adminVideoDnd'

export function AdminTopicList({ topics }: { topics: AdminTopicData[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function reorder(draggedId: string, beforeId: string) {
    if (draggedId === beforeId) return
    const next = reorderIds(
      topics.map(t => t.id),
      draggedId,
      beforeId
    )
    startTransition(async () => {
      await reorderTopicsAction(next)
      router.refresh()
    })
  }

  return (
    <div className="grid gap-4">
      {topics.map(topic => (
        <DropZone
          key={topic.id}
          accept={MIME_TOPIC}
          onDrop={draggedId => reorder(draggedId, topic.id)}
        >
          <AdminTopicCard topic={topic} />
        </DropZone>
      ))}
    </div>
  )
}

'use client'

import { useOptimistic, useTransition } from 'react'

import { reorderTopicsAction } from '@/modules/dictation/content/adminActions'

import { AdminTopicCard, type AdminTopicData } from './AdminTopicCard'
import { DropZone, MIME_TOPIC, reorderIds } from './adminVideoDnd'

export function AdminTopicList({ topics }: { topics: AdminTopicData[] }) {
  // The dragged order shows at once; the action revalidates the page, so its
  // response replaces this with the server's order (no router.refresh()).
  const [orderedTopics, setTopicOrder] = useOptimistic(
    topics,
    (current, ids: string[]) => {
      const byId = new Map(current.map(topic => [topic.id, topic]))
      return ids.flatMap(id => {
        const topic = byId.get(id)
        return topic ? [topic] : []
      })
    }
  )
  const [, startTransition] = useTransition()

  function reorder(draggedId: string, beforeId: string) {
    if (draggedId === beforeId) return
    const next = reorderIds(
      orderedTopics.map(t => t.id),
      draggedId,
      beforeId
    )
    startTransition(async () => {
      setTopicOrder(next)
      await reorderTopicsAction(next)
    })
  }

  return (
    <div className="grid gap-4">
      {orderedTopics.map(topic => (
        <DropZone
          key={topic.id}
          accept={MIME_TOPIC}
          onDrop={draggedId => reorder(draggedId, topic.id)}
          className="min-w-0"
        >
          <AdminTopicCard topic={topic} />
        </DropZone>
      ))}
    </div>
  )
}

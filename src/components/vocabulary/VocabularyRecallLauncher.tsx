'use client'

import { BookOpen } from 'lucide-react'

import { ActionButton } from '@/components/ui/ActionButton'
import { cn } from '@/lib/utils'
import type { VocabRecallTaskRecord } from '@/modules/vocabulary/types'

interface Props {
  className?: string
  /** Due count from stats: the queue only holds one page of tasks. */
  dueCount: number
  onOpenRecall: () => void
  tasks: VocabRecallTaskRecord[]
}

/**
 * The page's main card: how many flashcards are due, the one action that
 * starts the review, and the next few words as chips with their stage.
 */
export function VocabularyRecallLauncher({
  className,
  dueCount,
  onOpenRecall,
  tasks,
}: Props) {
  const activeRecall = tasks[0] ?? null
  const due = activeRecall ? Math.max(dueCount, tasks.length) : 0

  return (
    <section
      aria-labelledby="vocab-recall-title"
      className={cn(
        'bg-pastel-mint rounded-panel grid content-between gap-4 p-4 sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2
            className="text-sm font-medium"
            id="vocab-recall-title"
          >
            Flashcard review
          </h2>
          <p className="flex items-baseline gap-2">
            <strong className="text-accent-green font-sans text-5xl leading-none font-light tabular-nums">
              {due}
            </strong>
            <span className="text-ink-soft text-sm">due</span>
          </p>
        </div>
        <span className="bg-surface/80 text-accent-green grid size-11 shrink-0 place-items-center rounded-full">
          <BookOpen
            aria-hidden="true"
            className="size-5"
          />
        </span>
      </div>

      {activeRecall ? (
        <div className="grid gap-2">
          <p className="text-xs font-medium">Next: {activeRecall.entry.term}</p>
          <ul className="flex flex-wrap gap-1.5">
            {tasks.slice(0, 6).map(task => (
              <li
                className="bg-surface/80 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                key={task.taskId}
              >
                <span className="font-medium">{task.entry.term}</span>
                <span className="text-ink-soft tabular-nums">
                  {task.item.recallStage}/7
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-ink-soft text-sm leading-6">
          No flashcards are due. Add words from Search or Explore and they will
          appear here immediately.
        </p>
      )}

      <ActionButton
        className="w-full"
        disabled={!activeRecall}
        icon={<BookOpen className="size-4" />}
        onClick={onOpenRecall}
        tone="ink"
      >
        Start Recall
      </ActionButton>
    </section>
  )
}

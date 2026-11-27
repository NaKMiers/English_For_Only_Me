'use client'

import { BookOpen } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { ActionButton } from '@/components/ui/ActionButton'
import { PageTag } from '@/components/ui/PageTag'
import type { VocabRecallTaskRecord } from '@/modules/vocabulary/types'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  /** Due count from stats: the queue only holds one page of tasks. */
  dueCount: number
  onOpenRecall: () => void
  tasks: VocabRecallTaskRecord[]
}

export function VocabularyRecallLauncher({
  dueCount,
  onOpenRecall,
  tasks,
}: Props) {
  const activeRecall = tasks[0] ?? null

  return (
    <ContentPanel
      eyebrow="Recall"
      title="Flashcard review"
      className="bg-pastel-lilac"
      action={
        <ActionButton
          disabled={!activeRecall}
          icon={<BookOpen className="size-4" />}
          onClick={onOpenRecall}
        >
          Start Recall
        </ActionButton>
      }
    >
      {activeRecall ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,380px)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PageTag tone="red">
                {Math.max(dueCount, tasks.length)} due
              </PageTag>
              <PageTag tone="ink">Next: {activeRecall.entry.term}</PageTag>
            </div>
            <p className="text-ink-soft max-w-3xl text-base leading-7">
              Review opens as a focused modal with listening, definition,
              word-choice, and example-memory prompts. It will auto-open once
              per day when cards are due.
            </p>
          </div>
          <div className="grid gap-2">
            {tasks.slice(0, 4).map(task => (
              <div
                key={task.taskId}
                className="border-line bg-surface/80 rounded-control border p-3"
              >
                <VocabTermHeader
                  entry={task.entry}
                  pronunciationClassName="sr-only"
                  headingClassName="text-xl"
                />
                <p className="text-ink-soft mt-2 text-xs">
                  Stage {task.item.recallStage}/7
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-ink-soft text-sm leading-6">
          No flashcards are due. Add words from Search or Explore and they will
          appear here immediately.
        </p>
      )}
    </ContentPanel>
  )
}

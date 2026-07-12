'use client'

import { BookOpen } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import type { VocabRecallTaskRecord } from '@/modules/vocabulary/types'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  onOpenRecall: () => void
  tasks: VocabRecallTaskRecord[]
}

export function VocabularyRecallLauncher({ onOpenRecall, tasks }: Props) {
  const activeRecall = tasks[0] ?? null

  return (
    <MangaPanel
      eyebrow="Recall"
      title="Flashcard review"
      className="bg-manga-black text-manga-white shadow-[6px_6px_0_var(--manga-red)]"
      action={
        <MangaButton
          disabled={!activeRecall}
          icon={<BookOpen className="size-4" />}
          onClick={onOpenRecall}
        >
          Start Recall
        </MangaButton>
      }
    >
      {activeRecall ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(260px,380px)]">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <PageTag tone="red">{tasks.length} due</PageTag>
              <PageTag tone="ink">Next: {activeRecall.entry.term}</PageTag>
            </div>
            <p className="text-manga-paper-soft max-w-3xl text-base leading-7 font-semibold">
              Review opens as a focused modal with listening, definition,
              word-choice, and example-memory prompts. It will auto-open once
              per day when cards are due.
            </p>
          </div>
          <div className="grid gap-2">
            {tasks.slice(0, 4).map(task => (
              <div
                key={task.taskId}
                className="border-manga-white/25 bg-manga-white/10 border-2 p-3"
              >
                <VocabTermHeader
                  entry={task.entry}
                  pronunciationClassName="sr-only"
                  headingClassName="text-xl text-manga-white"
                />
                <p className="text-manga-paper-soft mt-2 text-xs font-black uppercase">
                  Stage {task.item.recallStage}/7
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-manga-paper-soft text-sm leading-6 font-semibold">
          No flashcards are due. Add words from Search or Explore and they will
          appear here immediately.
        </p>
      )}
    </MangaPanel>
  )
}

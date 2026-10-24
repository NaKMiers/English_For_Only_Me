'use client'

import { MangaPanel } from '@/components/common/MangaPanel'
import { PageTag } from '@/components/ui/PageTag'

import type { VocabRecallCardResult } from './vocabRecallSession'

interface Props {
  results: VocabRecallCardResult[]
}

/**
 * What the last recall session did. Answers are saved in the background, so a
 * card whose save was rejected (usually an expired card) is listed here as
 * "not saved" instead of vanishing silently.
 */
export function VocabRecallSessionSummary({ results }: Props) {
  if (results.length === 0) return null

  const correctCount = results.filter(result => result.isCorrect).length
  const savingCount = results.filter(
    result => result.saveState === 'saving'
  ).length
  const notSaved = results.filter(result => result.saveState === 'notSaved')

  return (
    <MangaPanel
      eyebrow="Recall"
      title="Session summary"
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PageTag tone="ink">{results.length} reviewed</PageTag>
          <PageTag>{correctCount} correct</PageTag>
          {savingCount > 0 ? (
            <PageTag tone="sky">{savingCount} saving...</PageTag>
          ) : null}
          {notSaved.length > 0 ? (
            <PageTag tone="pale">{notSaved.length} not saved</PageTag>
          ) : null}
        </div>
        {notSaved.length > 0 ? (
          <ul className="grid gap-2">
            {notSaved.map(result => (
              <li
                key={result.taskId}
                className="border-manga-black bg-manga-pale-red rounded-control border-3 p-3 text-sm font-black"
              >
                <span className="uppercase">{result.term}</span>
                <span className="text-manga-ink-soft"> - not saved. </span>
                <span className="font-semibold">{result.error}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </MangaPanel>
  )
}

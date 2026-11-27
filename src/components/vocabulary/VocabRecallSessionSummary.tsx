'use client'

import { ContentPanel } from '@/components/common/ContentPanel'
import { PageTag } from '@/components/ui/PageTag'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'

import {
  VOCAB_RECALL_STALE_ERROR,
  type VocabRecallCardResult,
} from './vocabRecallSession'

interface Props {
  results: VocabRecallCardResult[]
}

/**
 * What the last recall session did. Answers are saved in the background, so a
 * card whose save was rejected (usually an expired card) is listed here as
 * "not saved" instead of vanishing silently.
 */
export function VocabRecallSessionSummary({ results }: Props) {
  const t = useMessages().vocabulary.summary

  if (results.length === 0) return null

  const correctCount = results.filter(result => result.isCorrect).length
  const savingCount = results.filter(
    result => result.saveState === 'saving'
  ).length
  const notSaved = results.filter(result => result.saveState === 'notSaved')

  return (
    <ContentPanel
      eyebrow={t.eyebrow}
      title={t.title}
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PageTag tone="ink">
            {format(t.reviewed, { count: results.length })}
          </PageTag>
          <PageTag>{format(t.correct, { count: correctCount })}</PageTag>
          {savingCount > 0 ? (
            <PageTag tone="sky">
              {format(t.saving, { count: savingCount })}
            </PageTag>
          ) : null}
          {notSaved.length > 0 ? (
            <PageTag tone="pale">
              {format(t.notSaved, { count: notSaved.length })}
            </PageTag>
          ) : null}
        </div>
        {notSaved.length > 0 ? (
          <ul className="grid gap-2">
            {notSaved.map(result => (
              <li
                key={result.taskId}
                className="border-line bg-tint-soft rounded-control border p-3 text-sm font-semibold"
              >
                <span>{result.term}</span>
                <span className="text-ink-soft">{t.rowNotSaved}</span>
                <span className="font-semibold">
                  {result.error === VOCAB_RECALL_STALE_ERROR
                    ? t.staleCard
                    : result.error}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </ContentPanel>
  )
}

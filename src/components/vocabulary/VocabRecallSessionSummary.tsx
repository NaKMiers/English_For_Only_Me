'use client'

import { InlineNotice } from '@/components/common/InlineNotice'
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
 * After a recall session closes: only the cards that could not be saved
 * (usually an expired card), so none vanish silently. The rest of the
 * session's story is told by the end screen inside the modal.
 */
export function VocabRecallSessionSummary({ results }: Props) {
  const t = useMessages().vocabulary.summary
  const notSaved = results.filter(result => result.saveState === 'notSaved')

  if (notSaved.length === 0) return null

  return (
    <InlineNotice tone="error">
      <p className="font-medium">
        {t.title}: {format(t.notSaved, { count: notSaved.length })}
      </p>
      <ul className="grid gap-1">
        {notSaved.map(result => (
          <li key={result.taskId}>
            <span className="font-medium">{result.term}</span>{' '}
            <span>{t.rowNotSaved}</span>{' '}
            <span>
              {result.error === VOCAB_RECALL_STALE_ERROR
                ? t.staleCard
                : result.error}
            </span>
          </li>
        ))}
      </ul>
    </InlineNotice>
  )
}

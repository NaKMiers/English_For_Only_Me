'use client'

import { BookmarkPlus, Check } from 'lucide-react'
import { useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { enqueueVocabItemStatus } from '@/components/vocabulary/vocabItemWrites'
import { lookupVocabEntryApi } from '@/requests/vocabularyApi'
import { ExamIconButton } from '@/components/ielts/ui'

/**
 * Save the word behind a missed answer to Vocabulary (source `ielts`):
 * look it up (creating the dictionary entry if needed), then queue the
 * "should learn" status like any other vocabulary write.
 */
export function SaveWordButton({
  context,
  term,
}: {
  context: string
  term: string
}) {
  const outbox = useClientOutbox()
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'failed'>(
    'idle'
  )

  const save = async () => {
    setState('busy')

    try {
      const { entry } = await lookupVocabEntryApi({
        occurrence: {
          contextSentence: context.slice(0, 3000) || null,
          reason: 'dictionaryLookup',
          selectedText: term,
        },
        term,
      })
      const outcome = await enqueueVocabItemStatus(outbox, {
        source: 'ielts',
        status: 'shouldLearn',
        vocabEntryId: entry.id,
      })

      setState(outcome.kind === 'failed' ? 'failed' : 'saved')
    } catch {
      setState('failed')
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <ExamIconButton
        className="size-9"
        disabled={state === 'busy' || state === 'saved'}
        label={
          state === 'saved'
            ? `Đã lưu "${term}"`
            : `Lưu "${term}" vào Vocabulary`
        }
        onClick={() => void save()}
        type="button"
      >
        {state === 'saved' ? (
          <Check
            aria-hidden="true"
            className="size-4"
          />
        ) : (
          <BookmarkPlus
            aria-hidden="true"
            className="size-4"
          />
        )}
      </ExamIconButton>
      <span
        aria-live="polite"
        className="text-xs font-semibold"
      >
        {state === 'saved'
          ? 'Đã lưu'
          : state === 'failed'
            ? 'Không lưu được'
            : `Lưu "${term}"`}
      </span>
    </span>
  )
}

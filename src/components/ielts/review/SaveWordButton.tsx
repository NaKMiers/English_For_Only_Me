'use client'

import { BookmarkPlus, Check, CircleAlert } from 'lucide-react'
import { useState } from 'react'

import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import { enqueueVocabItemStatus } from '@/components/vocabulary/vocabItemWrites'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { lookupVocabEntryApi } from '@/requests/vocabularyApi'
import { ExamButton } from '@/components/ielts/ui'

/**
 * Save the word behind a missed answer to Vocabulary (source `ielts`):
 * look it up (creating the dictionary entry if needed), then queue the
 * "should learn" status like any other vocabulary write.
 */
export function SaveWordButton({
  context,
  initiallySaved = false,
  onSaved,
  term,
}: {
  context: string
  /** The learner already has this word: start in the saved state. */
  initiallySaved?: boolean
  /** Told once the word is saved, so the list can remember it. */
  onSaved?: () => void
  term: string
}) {
  const t = useMessages().ielts.saveWord
  const outbox = useClientOutbox()
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'failed'>(
    initiallySaved ? 'saved' : 'idle'
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

      if (outcome.kind === 'failed') {
        setState('failed')
        return
      }

      setState('saved')
      onSaved?.()
    } catch {
      setState('failed')
    }
  }

  // One labelled button with its icon inside (not an icon button plus a
  // caption beside it); a failed save says so next to it.
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <ExamButton
        disabled={state === 'busy' || state === 'saved'}
        icon={
          state === 'saved' ? (
            <Check
              aria-hidden="true"
              className="size-4"
            />
          ) : (
            <BookmarkPlus
              aria-hidden="true"
              className="size-4"
            />
          )
        }
        onClick={() => void save()}
        title={format(t.saveLabel, { term })}
        tone="paper"
        type="button"
      >
        {state === 'saved'
          ? format(t.savedLabel, { term })
          : format(t.save, { term })}
      </ExamButton>
      {state === 'failed' ? (
        <span
          className="text-danger inline-flex items-center gap-1 text-xs"
          role="alert"
        >
          <CircleAlert
            aria-hidden="true"
            className="size-3.5"
          />
          {t.failed}
        </span>
      ) : null}
    </span>
  )
}

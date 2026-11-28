'use client'

import { useRef, useState, type ReactNode } from 'react'

import {
  useClientOutbox,
  useOutboxOwnerKey,
} from '@/components/common/OutboxOwnerProvider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
  hasVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'
import {
  getVocabRequestErrorMessage,
  type VocabOccurrenceInput,
} from '@/requests/vocabularyApi'

import {
  decisionOf,
  VocabDecisionButtons,
  vocabStatusLabel,
} from './VocabDecisionButtons'
import { VocabTermHeader } from './VocabTermHeader'
import {
  buildOptimisticUserItem,
  createEntryWriteTracker,
  enqueueVocabItemStatus,
  type VocabMarkStatus,
} from './vocabItemWrites'
import {
  lookupVocabEntryCached,
  updateCachedVocabUserItem,
} from './vocabLookupCache'

interface WordButtonProps {
  attemptId?: string | null
  children?: ReactNode
  className?: string
  contextSentence: string
  onError?: (message: string | null) => void
  reason?: 'clickedInAnswer' | 'missedWord' | 'aiDebrief'
  segmentId?: string | null
  term: string
  videoId?: string | null
}

function getVietnamese(entry: VocabEntryWithUserStateRecord, fallback: string) {
  return getRequiredVietnameseMeaning(entry.entry, fallback)
}

function getDefinition(entry: VocabEntryWithUserStateRecord) {
  return getEnglishDefinition(entry.entry)
}

function normalizeLookupTerm(term: string) {
  return term.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, '')
}

/**
 * Shared lookup + mark state for the quick lookup surfaces (the word button, the IELTS highlighter). A mark closes the
 * dialog at once and shows the new status; the write goes through the outbox
 * and a rejected write puts the old status back and reports the error.
 */
export function useQuickVocabEntry({
  onMarkFailed,
}: {
  onMarkFailed: (message: string) => void
}) {
  const outbox = useClientOutbox()
  const owner = useOutboxOwnerKey()
  const [entry, setEntry] = useState<VocabEntryWithUserStateRecord | null>(null)
  const [open, setOpen] = useState(false)
  const trackerRef = useRef(
    createEntryWriteTracker<UserVocabItemApiRecord | null>()
  )

  function setEntryUserItem(
    entryId: string,
    userItem: UserVocabItemApiRecord | null
  ) {
    updateCachedVocabUserItem(owner, entryId, userItem)
    setEntry(current =>
      current?.entry.id === entryId ? { ...current, userItem } : current
    )
  }

  async function lookup({
    occurrence,
    term,
  }: {
    occurrence: VocabOccurrenceInput
    term: string
  }) {
    const record = await lookupVocabEntryCached({ occurrence, owner, term })

    setEntry(record)
    setOpen(true)
  }

  async function mark(status: VocabMarkStatus) {
    if (!entry) return

    const entryId = entry.entry.id
    const ticket = trackerRef.current.begin(entryId, entry.userItem)

    setEntryUserItem(
      entryId,
      buildOptimisticUserItem({ entry, source: 'manual', status })
    )
    setOpen(false)

    const outcome = await enqueueVocabItemStatus(outbox, {
      source: 'manual',
      status,
      vocabEntryId: entryId,
    })
    const settled = trackerRef.current.settle(
      entryId,
      ticket,
      outcome.kind === 'saved'
        ? { kind: 'saved', state: outcome.item }
        : outcome
    )

    if (settled.kind === 'ignore') return

    setEntryUserItem(entryId, settled.state)

    if (settled.kind === 'rollback' && outcome.kind === 'failed')
      onMarkFailed(outcome.error)
  }

  return { entry, lookup, mark, open, setOpen }
}

interface QuickVocabDialogProps {
  entry: VocabEntryWithUserStateRecord | null
  error?: string | null
  onMark: (status: VocabMarkStatus) => void
  onOpenChange: (open: boolean) => void
  open: boolean
}

/** The word card shared by every quick lookup surface. */
export function QuickVocabDialog({
  entry,
  error = null,
  onMark,
  onOpenChange,
  open,
}: QuickVocabDialogProps) {
  const t = useMessages().vocabulary

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="border-line bg-surface border">
        {entry ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">{entry.entry.term}</DialogTitle>
              {/* The saved pick (or a not-ready status) in words; the buttons
                  show the pick too. */}
              <DialogDescription className="text-ink-soft text-sm font-normal">
                {vocabStatusLabel(entry, t) ?? t.itemStatus.notPicked}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <VocabTermHeader entry={entry.entry} />
              {/* Compact, like the search result: the meaning as one chip,
                  the definition as plain text, no boxes. */}
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="sr-only">{t.search.vietnameseMeaning}: </span>
                <span className="bg-pastel-mint rounded-tag px-2 py-0.5 text-base leading-7 font-medium">
                  {getVietnamese(entry, t.word.needsMeaning)}
                </span>
              </p>
              <p className="text-ink-soft text-sm leading-6 font-normal">
                {getDefinition(entry)}
              </p>
              <VocabDecisionButtons
                decision={decisionOf(entry.userItem?.status)}
                disabled={!hasVietnameseMeaning(entry.entry)}
                error={error}
                onDecide={onMark}
              />
              {!hasVietnameseMeaning(entry.entry) ? (
                <p className="text-brand-ink text-sm font-medium">
                  {t.word.meaningRequired}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function QuickVocabWordButton({
  attemptId = null,
  children,
  className,
  contextSentence,
  onError,
  reason = 'clickedInAnswer',
  segmentId = null,
  term,
  videoId = null,
}: WordButtonProps) {
  const t = useMessages().vocabulary
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { entry, lookup, mark, open, setOpen } = useQuickVocabEntry({
    onMarkFailed: message => {
      if (onError) onError(message)
      else {
        // The error line lives in the dialog, so bring it back to show it.
        setError(message)
        setOpen(true)
      }
    },
  })
  const lookupTerm = normalizeLookupTerm(term)

  if (!lookupTerm) return <>{children ?? term}</>

  async function lookupWord() {
    setBusy(true)
    setError(null)
    onError?.(null)

    try {
      await lookup({
        occurrence: {
          attemptId,
          contextSentence,
          reason,
          segmentId,
          selectedText: lookupTerm,
          videoId,
        },
        term: lookupTerm,
      })
    } catch (requestError) {
      const message = getVocabRequestErrorMessage(requestError, t.errors.lookup)

      if (onError) onError(message)
      else setError(message)
    } finally {
      setBusy(false)
    }
  }

  function markWord(status: VocabMarkStatus) {
    setError(null)
    void mark(status)
  }

  return (
    <>
      <button
        aria-label={format(t.word.lookup, { term: lookupTerm })}
        className={className}
        disabled={busy}
        onClick={lookupWord}
        type="button"
      >
        {children ?? term}
      </button>

      <QuickVocabDialog
        entry={entry}
        error={error}
        onMark={markWord}
        onOpenChange={setOpen}
        open={open}
      />
    </>
  )
}

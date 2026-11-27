'use client'

import { BookOpen, Check, Search } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { ActionButton } from '@/components/ui/ActionButton'
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

interface Props {
  attemptId?: string | null
  className?: string
  contextSentence: string
  reason?: 'clickedInAnswer' | 'missedWord' | 'aiDebrief'
  segmentId?: string | null
  videoId?: string | null
}

const WORD_PATTERN = /[A-Za-z][A-Za-z'-]*/g

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

function tokenize(text: string) {
  return Array.from(text.matchAll(WORD_PATTERN)).map(match => ({
    index: match.index ?? 0,
    term: match[0],
  }))
}

function normalizeLookupTerm(term: string) {
  return term.replace(/^[^A-Za-z]+|[^A-Za-z'-]+$/g, '')
}

/**
 * Shared lookup + mark state for both quick lookup surfaces. A mark closes the
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
              <DialogDescription className="text-ink-soft text-sm font-normal">
                {t.enrichmentStatus[entry.entry.enrichmentStatus]}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              <VocabTermHeader entry={entry.entry} />
              <div className="border-line bg-tint rounded-control border p-3 text-right text-base leading-7 font-semibold">
                {getVietnamese(entry, t.word.needsMeaning)}
              </div>
              <div className="border-line bg-surface rounded-control border p-3 text-base leading-7 font-semibold">
                {getDefinition(entry)}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <ActionButton
                  className="[&>span:last-child]:whitespace-nowrap"
                  disabled={!hasVietnameseMeaning(entry.entry)}
                  icon={<BookOpen className="size-4" />}
                  onClick={() => onMark('shouldLearn')}
                >
                  {t.marks.shouldLearn}
                </ActionButton>
                <ActionButton
                  className="[&>span:last-child]:whitespace-nowrap"
                  disabled={!hasVietnameseMeaning(entry.entry)}
                  icon={<Check className="size-4" />}
                  onClick={() => onMark('alreadyKnow')}
                  tone="paper"
                >
                  {t.marks.alreadyKnow}
                </ActionButton>
              </div>
              <p className="text-ink-soft flex items-center gap-2 text-xs font-normal">
                <Search className="size-4" />
                {entry.userItem
                  ? t.itemStatus[entry.userItem.status]
                  : t.itemStatus.notPicked}
              </p>
              {error ? (
                <p className="text-danger text-sm font-semibold">{error}</p>
              ) : null}
              {!hasVietnameseMeaning(entry.entry) ? (
                <p className="text-brand text-sm font-semibold">
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

export function QuickVocabLookup({
  attemptId = null,
  className,
  contextSentence,
  reason = 'clickedInAnswer',
  segmentId = null,
  videoId = null,
}: Props) {
  const t = useMessages().vocabulary
  const [error, setError] = useState<string | null>(null)
  const [busyTerm, setBusyTerm] = useState<string | null>(null)
  const { entry, lookup, mark, open, setOpen } = useQuickVocabEntry({
    onMarkFailed: setError,
  })

  async function lookupWord(term: string) {
    setBusyTerm(term)
    setError(null)

    try {
      await lookup({
        occurrence: {
          attemptId,
          contextSentence,
          reason,
          segmentId,
          selectedText: term,
          videoId,
        },
        term,
      })
    } catch (requestError) {
      setError(getVocabRequestErrorMessage(requestError, t.errors.lookup))
    } finally {
      setBusyTerm(null)
    }
  }

  function markWord(status: VocabMarkStatus) {
    setError(null)
    void mark(status)
  }

  const tokens = tokenize(contextSentence)

  if (tokens.length === 0) return null

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {tokens.map(token => (
          <Button
            key={`${token.term}-${token.index}`}
            className="border-line bg-surface hover:bg-tint rounded-control h-auto border px-2 py-1 text-sm font-semibold"
            disabled={busyTerm === token.term}
            onClick={() => lookupWord(token.term)}
            type="button"
            variant="ghost"
          >
            {token.term}
          </Button>
        ))}
      </div>
      {error ? (
        <p className="text-danger mt-2 text-sm font-semibold">{error}</p>
      ) : null}

      <QuickVocabDialog
        entry={entry}
        onMark={markWord}
        onOpenChange={setOpen}
        open={open}
      />
    </div>
  )
}

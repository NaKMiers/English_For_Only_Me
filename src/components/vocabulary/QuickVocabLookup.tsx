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
import { MangaButton } from '@/components/ui/MangaButton'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
} from '@/modules/vocabulary/types'
import {
  getEnglishDefinition,
  getRequiredVietnameseMeaning,
  hasVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'
import type { VocabOccurrenceInput } from '@/requests/vocabularyApi'

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

function getVietnamese(entry: VocabEntryWithUserStateRecord) {
  return getRequiredVietnameseMeaning(entry.entry)
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
function useQuickVocabEntry({
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
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Could not lookup this word.'

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
        aria-label={`Lookup ${lookupTerm}`}
        className={className}
        disabled={busy}
        onClick={lookupWord}
        type="button"
      >
        {children ?? term}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white border-3 shadow-[6px_6px_0_var(--manga-black)]">
          {entry ? (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  {entry.entry.term}
                </DialogTitle>
                <DialogDescription className="text-manga-ink-soft text-sm font-semibold">
                  {entry.entry.enrichmentStatus}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <VocabTermHeader entry={entry.entry} />
                <div className="border-manga-black bg-manga-paper-soft rounded-control border-2 p-3 text-right text-base leading-7 font-black">
                  {getVietnamese(entry)}
                </div>
                <div className="border-manga-black bg-manga-white rounded-control border-2 p-3 text-base leading-7 font-semibold">
                  {getDefinition(entry)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    disabled={!hasVietnameseMeaning(entry.entry)}
                    icon={<BookOpen className="size-4" />}
                    onClick={() => markWord('shouldLearn')}
                  >
                    Should Learn
                  </MangaButton>
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    disabled={!hasVietnameseMeaning(entry.entry)}
                    icon={<Check className="size-4" />}
                    onClick={() => markWord('alreadyKnow')}
                    tone="paper"
                  >
                    Already Know
                  </MangaButton>
                </div>
                <p className="text-manga-ink-soft flex items-center gap-2 text-xs font-black uppercase">
                  <Search className="size-4" />
                  {entry.userItem?.status ?? 'Not picked yet'}
                </p>
                {error ? (
                  <p className="text-manga-red text-sm font-black">{error}</p>
                ) : null}
                {!hasVietnameseMeaning(entry.entry) ? (
                  <p className="text-manga-red text-sm font-black">
                    Vietnamese meaning is required before this word can be
                    learned.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
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
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not lookup this word.'
      )
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
            className="border-manga-black bg-manga-white hover:bg-manga-paper-soft rounded-control h-auto border-2 px-2 py-1 text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
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
        <p className="text-manga-red mt-2 text-sm font-black">{error}</p>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white border-3 shadow-[6px_6px_0_var(--manga-black)]">
          {entry ? (
            <>
              <DialogHeader>
                <DialogTitle className="sr-only">
                  {entry.entry.term}
                </DialogTitle>
                <DialogDescription className="text-manga-ink-soft text-sm font-semibold">
                  {entry.entry.enrichmentStatus}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <VocabTermHeader entry={entry.entry} />
                <div className="border-manga-black bg-manga-paper-soft rounded-control border-2 p-3 text-right text-base leading-7 font-black">
                  {getVietnamese(entry)}
                </div>
                <div className="border-manga-black bg-manga-white rounded-control border-2 p-3 text-base leading-7 font-semibold">
                  {getDefinition(entry)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    disabled={!hasVietnameseMeaning(entry.entry)}
                    icon={<BookOpen className="size-4" />}
                    onClick={() => markWord('shouldLearn')}
                  >
                    Should Learn
                  </MangaButton>
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    disabled={!hasVietnameseMeaning(entry.entry)}
                    icon={<Check className="size-4" />}
                    onClick={() => markWord('alreadyKnow')}
                    tone="paper"
                  >
                    Already Know
                  </MangaButton>
                </div>
                <p className="text-manga-ink-soft flex items-center gap-2 text-xs font-black uppercase">
                  <Search className="size-4" />
                  {entry.userItem?.status ?? 'Not picked yet'}
                </p>
                {!hasVietnameseMeaning(entry.entry) ? (
                  <p className="text-manga-red text-sm font-black">
                    Vietnamese meaning is required before this word can be
                    learned.
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

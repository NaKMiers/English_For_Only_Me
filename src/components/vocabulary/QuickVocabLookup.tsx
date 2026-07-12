'use client'

import { BookOpen, Check, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MangaButton } from '@/components/ui/MangaButton'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import {
  lookupVocabEntryApi,
  setVocabItemStatusApi,
} from '@/requests/vocabularyApi'

import { VocabTermHeader } from './VocabTermHeader'

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

function getDefinition(entry: VocabEntryWithUserStateRecord) {
  return (
    entry.entry.definitions[0]?.definition ??
    entry.entry.localizedMeanings[0]?.meaning ??
    'No definition is available yet.'
  )
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
  const [entry, setEntry] = useState<VocabEntryWithUserStateRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const lookupTerm = normalizeLookupTerm(term)

  if (!lookupTerm) return <>{children ?? term}</>

  async function lookup() {
    setBusy(true)
    setError(null)
    onError?.(null)

    try {
      const response = await lookupVocabEntryApi({
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

      setEntry(response)
      setOpen(true)
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

  async function mark(status: 'shouldLearn' | 'alreadyKnow') {
    if (!entry) return

    setError(null)

    try {
      const response = await setVocabItemStatusApi({
        source: 'manual',
        status,
        vocabEntryId: entry.entry.id,
      })

      setEntry({
        ...entry,
        userItem: response.item,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not update this word.'
      )
    }
  }

  return (
    <>
      <button
        aria-label={`Lookup ${lookupTerm}`}
        className={className}
        disabled={busy}
        onClick={lookup}
        type="button"
      >
        {children ?? term}
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent className="border-manga-black bg-manga-white rounded-none border-3 shadow-[6px_6px_0_var(--manga-black)]">
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
                <div className="border-manga-black bg-manga-paper-soft border-2 p-3 text-base leading-7 font-semibold">
                  {getDefinition(entry)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    icon={<BookOpen className="size-4" />}
                    onClick={() => mark('shouldLearn')}
                  >
                    Should Learn
                  </MangaButton>
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    icon={<Check className="size-4" />}
                    onClick={() => mark('alreadyKnow')}
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
  const [entry, setEntry] = useState<VocabEntryWithUserStateRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [busyTerm, setBusyTerm] = useState<string | null>(null)

  async function lookup(term: string) {
    setBusyTerm(term)
    setError(null)

    try {
      const response = await lookupVocabEntryApi({
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

      setEntry(response)
      setOpen(true)
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

  async function mark(status: 'shouldLearn' | 'alreadyKnow') {
    if (!entry) return

    setError(null)

    try {
      const response = await setVocabItemStatusApi({
        source: 'manual',
        status,
        vocabEntryId: entry.entry.id,
      })

      setEntry({
        ...entry,
        userItem: response.item,
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Could not update this word.'
      )
    }
  }

  const tokens = tokenize(contextSentence)

  if (tokens.length === 0) return null

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {tokens.map(token => (
          <Button
            key={`${token.term}-${token.index}`}
            className="border-manga-black bg-manga-white hover:bg-manga-paper-soft h-auto rounded-none border-2 px-2 py-1 text-sm font-black shadow-[2px_2px_0_var(--manga-black)]"
            disabled={busyTerm === token.term}
            onClick={() => lookup(token.term)}
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
        <DialogContent className="border-manga-black bg-manga-white rounded-none border-3 shadow-[6px_6px_0_var(--manga-black)]">
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
                <div className="border-manga-black bg-manga-paper-soft border-2 p-3 text-base leading-7 font-semibold">
                  {getDefinition(entry)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    icon={<BookOpen className="size-4" />}
                    onClick={() => mark('shouldLearn')}
                  >
                    Should Learn
                  </MangaButton>
                  <MangaButton
                    className="[&>span:last-child]:whitespace-nowrap"
                    icon={<Check className="size-4" />}
                    onClick={() => mark('alreadyKnow')}
                    tone="paper"
                  >
                    Already Know
                  </MangaButton>
                </div>
                <p className="text-manga-ink-soft flex items-center gap-2 text-xs font-black uppercase">
                  <Search className="size-4" />
                  {entry.userItem?.status ?? 'Not picked yet'}
                </p>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

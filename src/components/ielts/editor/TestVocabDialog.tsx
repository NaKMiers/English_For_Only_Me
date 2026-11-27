'use client'

import { ArrowDown, ArrowUp, Plus, Save, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ExamButton, ExamIconButton } from '@/components/ielts/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMessages } from '@/i18n/client'
import { format, plural } from '@/i18n/format'
import { cn } from '@/lib/utils'
import { IELTS_TEST_VOCAB_MAX } from '@/modules/ielts/constants'
import type { VocabEntryApiRecord } from '@/modules/vocabulary/types'
import { getVietnameseMeaning } from '@/modules/vocabulary/vietnameseMeaning'
import {
  readIeltsTestVocabApi,
  saveIeltsTestVocabApi,
} from '@/requests/ieltsAdminApi'
import { lookupVocabEntryApi, searchVocabApi } from '@/requests/vocabularyApi'

import { INNER_BOX_CLASS, MetaChip, RowActions, TextField } from './fields'

interface Props {
  onOpenChange: (open: boolean) => void
  open: boolean
  testId: string
}

const SEARCH_DELAY_MS = 250

function errorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list

  const next = [...list]
  const [item] = next.splice(from, 1)

  next.splice(to, 0, item)

  return next
}

function WordLine({ entry }: { entry: VocabEntryApiRecord }) {
  const t = useMessages()
  const meaning = getVietnameseMeaning(entry)

  return (
    <div className="grid min-w-0 flex-1 gap-0.5">
      <p className="truncate font-sans text-sm font-semibold">
        {entry.term}
        {entry.partOfSpeech ? (
          <span className="text-muted-foreground ml-1 text-xs font-semibold">
            {entry.partOfSpeech}
          </span>
        ) : null}
      </p>
      {meaning ? (
        <p className="text-muted-foreground truncate text-xs font-semibold">
          {meaning}
        </p>
      ) : (
        <MetaChip
          className="w-fit"
          tone="warn"
        >
          {t.ieltsEditor.vocab.noMeaning}
        </MetaChip>
      )}
    </div>
  )
}

/**
 * The words learners can read before starting this test (shown under the
 * skill cards on /ielts/<slug>). Search the dictionary, add, reorder, save.
 * A word missing from the dictionary can be looked up, which creates it.
 */
export function TestVocabDialog({ onOpenChange, open, testId }: Props) {
  const t = useMessages()
  const copy = t.ieltsEditor.vocab
  const [words, setWords] = useState<VocabEntryApiRecord[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loaded' | 'failed'>(
    'idle'
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState<'save' | 'lookup' | null>(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VocabEntryApiRecord[]>([])
  const [searching, setSearching] = useState(false)
  const searchSeqRef = useRef(0)
  const searchTimerRef = useRef<number | null>(null)
  const loading = open && loadState === 'idle'

  // The list loads the first time the dialog opens; unsaved edits stay when
  // it is closed and opened again.
  useEffect(() => {
    if (!open || loadState !== 'idle') return

    let cancelled = false

    readIeltsTestVocabApi(testId)
      .then(response => {
        if (cancelled) return
        setWords(response.entries)
        setLoadState('loaded')
      })
      .catch(cause => {
        if (cancelled) return
        setError(errorText(cause, copy.loadFailed))
        setLoadState('failed')
      })

    return () => {
      cancelled = true
    }
  }, [copy.loadFailed, loadState, open, testId])

  useEffect(
    () => () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)
    },
    []
  )

  function changeQuery(value: string) {
    const term = value.trim()
    const seq = ++searchSeqRef.current

    setQuery(value)
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)

    if (!term) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    searchTimerRef.current = window.setTimeout(() => {
      searchVocabApi({ limit: 12, query: term })
        .then(response => {
          if (seq === searchSeqRef.current)
            setResults(response.entries.map(item => item.entry))
        })
        .catch(cause => {
          if (seq === searchSeqRef.current)
            setError(errorText(cause, copy.searchFailed))
        })
        .finally(() => {
          if (seq === searchSeqRef.current) setSearching(false)
        })
    }, SEARCH_DELAY_MS)
  }

  const chosen = new Set(words.map(word => word.id))
  const full = words.length >= IELTS_TEST_VOCAB_MAX

  function update(next: VocabEntryApiRecord[]) {
    setWords(next)
    setDirty(true)
  }

  function add(entry: VocabEntryApiRecord) {
    if (chosen.has(entry.id) || full) return

    update([...words, entry])
  }

  async function lookup() {
    const term = query.trim()

    if (!term) return

    setBusy('lookup')
    setError('')

    try {
      const response = await lookupVocabEntryApi({ term })

      add(response.entry)
      changeQuery('')
    } catch (cause) {
      setError(errorText(cause, format(copy.lookupFailed, { term })))
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    setBusy('save')
    setError('')

    try {
      const response = await saveIeltsTestVocabApi(
        testId,
        words.map(word => word.id)
      )

      setWords(response.entries)
      setDirty(false)
      onOpenChange(false)
    } catch (cause) {
      setError(errorText(cause, copy.saveFailed))
    } finally {
      setBusy(null)
    }
  }

  const term = query.trim()
  const exactMatch = results.some(
    entry => entry.normalizedTerm === term.toLowerCase()
  )

  return (
    <Dialog
      onOpenChange={onOpenChange}
      open={open}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-3">
          <div className="grid gap-2">
            <TextField
              label={copy.search}
              onChange={changeQuery}
              placeholder={copy.searchPlaceholder}
              value={query}
            />
            {term ? (
              <div className={cn(INNER_BOX_CLASS, 'grid gap-1 p-2')}>
                {results.map(entry => (
                  <div
                    className="flex min-w-0 items-center gap-2"
                    key={entry.id}
                  >
                    <WordLine entry={entry} />
                    <ExamIconButton
                      className="size-9"
                      disabled={chosen.has(entry.id) || full}
                      label={
                        chosen.has(entry.id)
                          ? format(copy.alreadyAdded, { term: entry.term })
                          : format(copy.add, { term: entry.term })
                      }
                      onClick={() => add(entry)}
                      type="button"
                    >
                      <Plus
                        aria-hidden="true"
                        className="size-4"
                      />
                    </ExamIconButton>
                  </div>
                ))}
                {searching ? (
                  <p className="text-muted-foreground text-xs font-semibold">
                    {copy.searching}
                  </p>
                ) : !results.length ? (
                  <p className="text-muted-foreground text-xs font-semibold">
                    {format(copy.noResults, { term })}
                  </p>
                ) : null}
                {!searching && !exactMatch ? (
                  <ExamButton
                    className="min-h-9 w-fit px-3 text-xs"
                    disabled={busy !== null || full}
                    icon={
                      <Search
                        aria-hidden="true"
                        className="size-4"
                      />
                    }
                    onClick={() => void lookup()}
                    tone="paper"
                    type="button"
                  >
                    {busy === 'lookup'
                      ? copy.lookingUp
                      : format(copy.lookUp, { term })}
                  </ExamButton>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <p className="font-sans text-xs font-semibold">
              {format(copy.inTest, {
                words: plural(t.ieltsEditor.counts.word, words.length),
              })}
            </p>
            {loading ? (
              <p className="text-muted-foreground text-sm font-semibold">
                {t.common.actions.loading}
              </p>
            ) : words.length ? (
              <ol className="grid gap-1">
                {words.map((entry, index) => (
                  <li
                    className={cn(
                      INNER_BOX_CLASS,
                      'flex min-w-0 items-center gap-2 px-2 py-1.5'
                    )}
                    key={entry.id}
                  >
                    <span className="text-muted-foreground w-7 shrink-0 text-right font-sans text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <WordLine entry={entry} />
                    <ExamIconButton
                      className="size-9"
                      disabled={index === 0}
                      label={format(copy.moveUp, { term: entry.term })}
                      onClick={() => update(move(words, index, index - 1))}
                      type="button"
                    >
                      <ArrowUp
                        aria-hidden="true"
                        className="size-4"
                      />
                    </ExamIconButton>
                    <ExamIconButton
                      className="size-9"
                      disabled={index === words.length - 1}
                      label={format(copy.moveDown, { term: entry.term })}
                      onClick={() => update(move(words, index, index + 1))}
                      type="button"
                    >
                      <ArrowDown
                        aria-hidden="true"
                        className="size-4"
                      />
                    </ExamIconButton>
                    <RowActions
                      label={format(copy.remove, { term: entry.term })}
                      onRemove={() =>
                        update(words.filter(word => word.id !== entry.id))
                      }
                    />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground text-sm font-semibold">
                {copy.empty}
              </p>
            )}
          </div>

          {error ? (
            <p
              className="text-brand text-sm font-semibold"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <ExamButton
            onClick={() => onOpenChange(false)}
            tone="paper"
            type="button"
          >
            {t.common.actions.close}
          </ExamButton>
          <ExamButton
            disabled={!dirty || busy !== null || loadState !== 'loaded'}
            icon={
              <Save
                aria-hidden="true"
                className="size-4"
              />
            }
            onClick={() => void save()}
            tone="ink"
            type="button"
          >
            {busy === 'save' ? t.common.actions.saving : copy.save}
          </ExamButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

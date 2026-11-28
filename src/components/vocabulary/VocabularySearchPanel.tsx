'use client'

import { List, Search } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { InlineNotice } from '@/components/common/InlineNotice'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import {
  hasVietnameseMeaning,
  getVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import {
  decisionOf,
  VocabDecisionButtons,
  vocabStatusLabel,
} from './VocabDecisionButtons'
import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  isLoading: boolean
  /** Why the last lookup failed (no entry found), shown under the input. */
  lookupError: string | null
  /** The last pick of the shown word failed: said under its buttons. */
  markError?: string | null
  /** The last pick of the shown word, e.g. "Queued harbour". */
  markStatus?: string | null
  markEntry: (input: {
    entry: VocabEntryWithUserStateRecord
    source: 'dictionary'
    status: 'shouldLearn' | 'alreadyKnow'
  }) => void
  onQueryChange: (query: string) => void
  query: string
  runLookup: (term: string) => void
  searchResults: VocabEntryWithUserStateRecord[]
  selectedEntry: VocabEntryWithUserStateRecord | null
  speakTerm: (term: string) => void
}

export function VocabularySearchPanel({
  isLoading,
  lookupError,
  markEntry,
  markError = null,
  markStatus = null,
  onQueryChange,
  query,
  runLookup,
  searchResults,
  selectedEntry,
  speakTerm,
}: Props) {
  const vocab = useMessages().vocabulary
  const t = vocab.search

  function statusOf(result: VocabEntryWithUserStateRecord) {
    return vocabStatusLabel(result, vocab)
  }

  function detailLine(result: VocabEntryWithUserStateRecord) {
    return [result.entry.partOfSpeech || null, statusOf(result)]
      .filter(Boolean)
      .join(' · ')
  }

  function pronunciationOf(result: VocabEntryWithUserStateRecord) {
    const phonetic = result.entry.phonetics.find(item => item.text.trim())

    return phonetic?.text ?? `/${result.entry.term}/`
  }

  const decision = selectedEntry
    ? decisionOf(selectedEntry.userItem?.status)
    : null

  return (
    <ContentPanel
      action={
        // The way to every saved word, in the search card's header so it
        // costs no row of its own.
        <ActionButton
          href="/vocabulary/words"
          icon={<List aria-hidden="true" />}
          tone="paper"
        >
          {vocab.dashboard.wordsLink}
        </ActionButton>
      }
      title={t.title}
      className="content-start gap-3 p-4 py-4"
    >
      <form
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2"
        onSubmit={event => {
          event.preventDefault()
          runLookup(query)
        }}
      >
        <Input
          aria-label={t.inputLabel}
          className="border-line bg-surface-muted h-11 rounded-full border px-4 font-sans text-base"
          onChange={event => onQueryChange(event.target.value)}
          placeholder={t.placeholder}
          type="search"
          value={query}
        />
        <ActionButton
          disabled={isLoading}
          icon={<Search className="size-4" />}
          type="submit"
        >
          {t.submit}
        </ActionButton>
      </form>

      {lookupError ? (
        <InlineNotice tone="error">{lookupError}</InlineNotice>
      ) : null}

      {selectedEntry ? (
        <div className="border-line bg-surface-muted rounded-control grid gap-3 border p-3">
          <div className="grid gap-2">
            <VocabTermHeader
              entry={selectedEntry.entry}
              speakTerm={speakTerm}
            />
            {/* The meaning sits under the word as one chip, part of speech
                and any not-ready status beside it: no box of its own. */}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="sr-only">{t.vietnameseMeaning}: </span>
              <span className="bg-pastel-mint rounded-tag px-2 py-0.5 text-base leading-7 font-medium">
                {getVietnameseMeaning(selectedEntry.entry) ??
                  vocab.word.needsMeaning}
              </span>
              {detailLine(selectedEntry) ? (
                <span className="text-ink-soft text-xs font-normal">
                  {detailLine(selectedEntry)}
                </span>
              ) : null}
            </p>
          </div>

          {selectedEntry.entry.definitions.length > 0 ? (
            <div className="grid gap-1.5">
              <p className="text-ink-soft text-xs font-normal">
                {t.englishDefinition}
              </p>
              <ol className="grid gap-1.5">
                {selectedEntry.entry.definitions
                  .slice(0, 3)
                  .map((definition, index) => (
                    <li
                      key={`${definition.partOfSpeech}:${definition.definition}`}
                      className="grid grid-cols-[1.25rem_minmax(0,1fr)] text-sm leading-6"
                    >
                      <span className="text-ink-soft tabular-nums">
                        {index + 1}.
                      </span>
                      <span className="min-w-0">
                        {definition.definition}
                        {definition.example ? (
                          <span className="text-ink-soft block text-xs leading-5 font-normal">
                            {definition.example}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
              </ol>
            </div>
          ) : (
            <p className="text-ink-soft text-sm leading-6 font-normal">
              {t.noDefinition}
            </p>
          )}

          {selectedEntry.entry.synonyms.length > 0 ? (
            <p className="text-ink-soft text-xs leading-5 font-normal">
              {format(t.synonyms, {
                list: selectedEntry.entry.synonyms.slice(0, 8).join(', '),
              })}
            </p>
          ) : null}

          <VocabDecisionButtons
            busy={isLoading}
            decision={decision}
            disabled={!hasVietnameseMeaning(selectedEntry.entry)}
            error={markError}
            onDecide={status =>
              markEntry({ entry: selectedEntry, source: 'dictionary', status })
            }
            status={markStatus}
          />
          {!hasVietnameseMeaning(selectedEntry.entry) ? (
            <p className="text-brand-ink text-sm font-medium">
              {vocab.word.meaningRequired}
            </p>
          ) : null}
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {searchResults.map(result => {
            const status = statusOf(result)

            return (
              <li key={result.entry.id}>
                {/* One line per match: word and sound on the left, meaning
                    on the right. The whole row loads that word above. */}
                <button
                  className="soft-press hover-pop border-line bg-surface hover:bg-tint-soft rounded-control flex min-h-12 w-full min-w-0 items-center gap-3 border px-3 py-2 text-left"
                  disabled={isLoading}
                  onClick={() => {
                    onQueryChange(result.entry.term)
                    void runLookup(result.entry.term)
                  }}
                  type="button"
                >
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate font-sans text-base leading-tight font-semibold">
                      {result.entry.term}
                    </span>
                    <span className="text-ink-soft truncate text-xs font-normal">
                      {pronunciationOf(result)}
                      {status ? ` · ${status}` : ''}
                    </span>
                  </span>
                  <span className="line-clamp-2 max-w-[55%] text-right text-sm leading-5 font-medium">
                    {getVietnameseMeaning(result.entry) ??
                      vocab.word.needsMeaning}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </ContentPanel>
  )
}

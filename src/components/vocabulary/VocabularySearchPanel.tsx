'use client'

import { BookOpen, Check, List, Search } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import {
  hasVietnameseMeaning,
  getVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  isLoading: boolean
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
  markEntry,
  onQueryChange,
  query,
  runLookup,
  searchResults,
  selectedEntry,
  speakTerm,
}: Props) {
  const vocab = useMessages().vocabulary
  const t = vocab.search

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

      {selectedEntry ? (
        <div className="border-line bg-surface-muted rounded-control grid gap-3 border p-3">
          <VocabTermHeader
            entry={selectedEntry.entry}
            speakTerm={speakTerm}
          />
          <p className="text-ink-soft text-xs font-normal">
            {vocab.enrichmentStatus[selectedEntry.entry.enrichmentStatus]}
            {selectedEntry.entry.partOfSpeech
              ? ` · ${selectedEntry.entry.partOfSpeech}`
              : ''}
          </p>

          <div className="bg-pastel-mint rounded-tag p-3 text-right">
            <p className="text-ink-soft text-xs">{t.vietnameseMeaning}</p>
            <p className="mt-1 text-base leading-7 font-medium">
              {getVietnameseMeaning(selectedEntry.entry) ??
                vocab.word.needsMeaning}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {selectedEntry.entry.definitions.slice(0, 3).map(definition => (
              <div
                key={`${definition.partOfSpeech}:${definition.definition}`}
                className="border-line bg-surface rounded-tag border p-3"
              >
                <p className="text-ink-soft text-xs font-normal">
                  {t.englishDefinition}
                </p>
                <p className="text-sm leading-6">{definition.definition}</p>
                {definition.example ? (
                  <p className="text-ink-soft mt-1 text-xs font-normal">
                    {definition.example}
                  </p>
                ) : null}
              </div>
            ))}
            {selectedEntry.entry.definitions.length === 0 ? (
              <p className="text-ink-soft text-sm leading-6 font-normal">
                {t.noDefinition}
              </p>
            ) : null}
          </div>

          {selectedEntry.entry.synonyms.length > 0 ? (
            <p className="text-ink-soft text-xs leading-5 font-normal">
              {format(t.synonyms, {
                list: selectedEntry.entry.synonyms.slice(0, 8).join(', '),
              })}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ActionButton
              className="[&>span:last-child]:whitespace-nowrap"
              disabled={isLoading || !hasVietnameseMeaning(selectedEntry.entry)}
              icon={<BookOpen className="size-4" />}
              onClick={() =>
                markEntry({
                  entry: selectedEntry,
                  source: 'dictionary',
                  status: 'shouldLearn',
                })
              }
            >
              {vocab.marks.shouldLearn}
            </ActionButton>
            <ActionButton
              className="[&>span:last-child]:whitespace-nowrap"
              disabled={isLoading || !hasVietnameseMeaning(selectedEntry.entry)}
              icon={<Check className="size-4" />}
              onClick={() =>
                markEntry({
                  entry: selectedEntry,
                  source: 'dictionary',
                  status: 'alreadyKnow',
                })
              }
              tone="paper"
            >
              {vocab.marks.alreadyKnow}
            </ActionButton>
          </div>
          {!hasVietnameseMeaning(selectedEntry.entry) ? (
            <p className="text-brand-ink text-sm font-medium">
              {vocab.word.meaningRequired}
            </p>
          ) : null}
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {searchResults.map(result => (
            <li key={result.entry.id}>
              {/* The whole result loads that word above. The header is
                  inline: no nested speak button (the loaded entry has its
                  own) and no heading inside the button. */}
              <button
                className="soft-press hover-pop border-line bg-surface hover:bg-tint-soft rounded-control grid w-full gap-2 border p-3 text-left"
                disabled={isLoading}
                onClick={() => {
                  onQueryChange(result.entry.term)
                  void runLookup(result.entry.term)
                }}
                type="button"
              >
                <VocabTermHeader
                  entry={result.entry}
                  headingClassName="text-xl"
                  inline
                />
                <span className="text-ink-soft text-xs font-normal">
                  {result.userItem
                    ? vocab.itemStatus[result.userItem.status]
                    : vocab.enrichmentStatus[result.entry.enrichmentStatus]}
                </span>
                <span className="line-clamp-2 text-right text-sm leading-6 font-medium">
                  {getVietnameseMeaning(result.entry) ??
                    vocab.word.needsMeaning}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </ContentPanel>
  )
}

'use client'

import { BookOpen, Check, Search } from 'lucide-react'

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
      eyebrow={t.eyebrow}
      title={t.title}
      className="bg-tint"
    >
      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto]"
        onSubmit={event => {
          event.preventDefault()
          runLookup(query)
        }}
      >
        <Input
          aria-label={t.inputLabel}
          className="border-line bg-surface rounded-control h-14 border px-4 font-sans text-lg font-semibold"
          onChange={event => onQueryChange(event.target.value)}
          placeholder={t.placeholder}
          type="search"
          value={query}
        />
        <ActionButton
          className="min-h-14"
          disabled={isLoading}
          icon={<Search className="size-4" />}
          type="submit"
        >
          {t.submit}
        </ActionButton>
      </form>

      {selectedEntry ? (
        <div className="border-line bg-surface rounded-control grid gap-3 border p-4">
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

          <div className="border-line bg-tint rounded-tag border p-3 text-right">
            <p className="text-xs font-semibold">{t.vietnameseMeaning}</p>
            <p className="mt-1 text-base leading-7 font-semibold">
              {getVietnameseMeaning(selectedEntry.entry) ??
                vocab.word.needsMeaning}
            </p>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            {selectedEntry.entry.definitions.slice(0, 3).map(definition => (
              <div
                key={`${definition.partOfSpeech}:${definition.definition}`}
                className="border-line bg-surface rounded-tag border p-3"
              >
                <p className="text-ink-soft text-xs font-normal">
                  {t.englishDefinition}
                </p>
                <p className="text-sm leading-6 font-semibold">
                  {definition.definition}
                </p>
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
            <p className="text-brand text-sm font-semibold">
              {vocab.word.meaningRequired}
            </p>
          ) : null}
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {searchResults.map(result => (
            <div
              key={result.entry.id}
              className="border-line bg-surface rounded-control grid gap-2 border p-3"
            >
              <VocabTermHeader
                entry={result.entry}
                headingClassName="text-xl"
                speakTerm={speakTerm}
              />
              <p className="text-ink-soft text-xs font-normal">
                {result.userItem
                  ? vocab.itemStatus[result.userItem.status]
                  : vocab.enrichmentStatus[result.entry.enrichmentStatus]}
              </p>
              <p className="line-clamp-2 text-right text-sm leading-6 font-semibold">
                {getVietnameseMeaning(result.entry) ?? vocab.word.needsMeaning}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </ContentPanel>
  )
}

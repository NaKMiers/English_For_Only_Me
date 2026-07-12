'use client'

import { BookOpen, Check, Search } from 'lucide-react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { Input } from '@/components/ui/input'
import { MangaButton } from '@/components/ui/MangaButton'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import {
  getRequiredVietnameseMeaning,
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
  return (
    <MangaPanel
      eyebrow="Dictionary"
      title="Search a word"
      className="bg-manga-paper-soft"
    >
      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto]"
        onSubmit={event => {
          event.preventDefault()
          runLookup(query)
        }}
      >
        <Input
          aria-label="Search vocabulary term"
          className="border-manga-black bg-manga-white h-14 rounded-none border-3 px-4 font-sans text-lg font-black shadow-[4px_4px_0_var(--manga-black)]"
          onChange={event => onQueryChange(event.target.value)}
          placeholder="Search any word..."
          type="search"
          value={query}
        />
        <MangaButton
          className="min-h-14"
          disabled={isLoading}
          icon={<Search className="size-4" />}
          type="submit"
        >
          Lookup
        </MangaButton>
      </form>

      {selectedEntry ? (
        <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-4 shadow-[3px_3px_0_var(--manga-black)]">
          <VocabTermHeader
            entry={selectedEntry.entry}
            speakTerm={speakTerm}
          />
          <p className="text-manga-ink-soft text-xs font-black uppercase">
            {selectedEntry.entry.enrichmentStatus}
            {selectedEntry.entry.partOfSpeech
              ? ` · ${selectedEntry.entry.partOfSpeech}`
              : ''}
          </p>

          <div className="border-manga-black bg-manga-paper-soft border-3 p-3 text-right">
            <p className="text-xs font-black uppercase">Vietnamese meaning</p>
            <p className="mt-1 text-base leading-7 font-black">
              {getRequiredVietnameseMeaning(selectedEntry.entry)}
            </p>
          </div>

          <div className="grid gap-2 lg:grid-cols-3">
            {selectedEntry.entry.definitions.slice(0, 3).map(definition => (
              <div
                key={`${definition.partOfSpeech}:${definition.definition}`}
                className="border-manga-black bg-manga-white border-2 p-3"
              >
                <p className="text-manga-ink-soft text-xs font-black uppercase">
                  English definition
                </p>
                <p className="text-sm leading-6 font-semibold">
                  {definition.definition}
                </p>
                {definition.example ? (
                  <p className="text-manga-ink-soft mt-1 text-xs font-semibold">
                    {definition.example}
                  </p>
                ) : null}
              </div>
            ))}
            {selectedEntry.entry.definitions.length === 0 ? (
              <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
                This word is saved, but no free provider definition is available
                yet.
              </p>
            ) : null}
          </div>

          {selectedEntry.entry.synonyms.length > 0 ? (
            <p className="text-manga-ink-soft text-xs leading-5 font-black">
              Synonyms: {selectedEntry.entry.synonyms.slice(0, 8).join(', ')}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <MangaButton
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
              Should Learn
            </MangaButton>
            <MangaButton
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
              Already Know
            </MangaButton>
          </div>
          {!hasVietnameseMeaning(selectedEntry.entry) ? (
            <p className="text-manga-red text-sm font-black">
              Vietnamese meaning is required before this word can be learned.
            </p>
          ) : null}
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {searchResults.map(result => (
            <div
              key={result.entry.id}
              className="border-manga-black bg-manga-white grid gap-2 border-2 p-3 shadow-[2px_2px_0_var(--manga-black)]"
            >
              <VocabTermHeader
                entry={result.entry}
                headingClassName="text-xl"
                speakTerm={speakTerm}
              />
              <p className="text-manga-ink-soft text-xs font-black uppercase">
                {result.userItem?.status ?? result.entry.enrichmentStatus}
              </p>
              <p className="line-clamp-2 text-right text-sm leading-6 font-semibold">
                {getVietnameseMeaning(result.entry) ??
                  'Needs Vietnamese meaning.'}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </MangaPanel>
  )
}

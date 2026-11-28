'use client'

import { BookOpen, Check, CircleCheck, List, Search } from 'lucide-react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { InlineNotice } from '@/components/common/InlineNotice'
import { Input } from '@/components/ui/input'
import { ActionButton } from '@/components/ui/ActionButton'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import { cn } from '@/lib/utils'
import type { VocabEntryWithUserStateRecord } from '@/modules/vocabulary/types'
import {
  hasVietnameseMeaning,
  getVietnameseMeaning,
} from '@/modules/vocabulary/vietnameseMeaning'

import { VocabTermHeader } from './VocabTermHeader'

interface Props {
  isLoading: boolean
  /** Why the last lookup failed (no entry found), shown under the input. */
  lookupError: string | null
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

type Decision = 'shouldLearn' | 'alreadyKnow'

/** The learner's pick for a word, read from their saved item. */
function decisionOf(result: VocabEntryWithUserStateRecord): Decision | null {
  const status = result.userItem?.status

  if (status === 'learning') return 'shouldLearn'
  if (status === 'alreadyKnow' || status === 'mastered') return 'alreadyKnow'

  return null
}

/** A picked mark reads as chosen, without taking the page's one dark CTA. */
const PICKED_CLASS_NAME: Record<Decision, string> = {
  alreadyKnow:
    'border-lesson-correct bg-pastel-mint text-ink hover:bg-pastel-mint',
  shouldLearn:
    'border-brand bg-brand-soft text-brand-ink hover:bg-brand-soft hover:text-brand-ink',
}

export function VocabularySearchPanel({
  isLoading,
  lookupError,
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

  // "Ready" is the normal case, so only a word that is not ready says so;
  // a word the learner has picked shows their pick (Should learn / Already
  // know, or Mastered) instead.
  function statusOf(result: VocabEntryWithUserStateRecord) {
    const status = result.userItem?.status
    const decision = decisionOf(result)

    if (status === 'mastered') return vocab.itemStatus.mastered
    if (decision) return vocab.decisions[decision]
    if (result.entry.enrichmentStatus === 'ready') return null

    return vocab.enrichmentStatus[result.entry.enrichmentStatus]
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

  const decision = selectedEntry ? decisionOf(selectedEntry) : null

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

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <ActionButton
              aria-pressed={decision === 'shouldLearn'}
              className={cn(
                '[&>span:last-child]:whitespace-nowrap',
                decision === 'shouldLearn' && PICKED_CLASS_NAME.shouldLearn
              )}
              disabled={isLoading || !hasVietnameseMeaning(selectedEntry.entry)}
              icon={
                decision === 'shouldLearn' ? (
                  <CircleCheck className="size-4" />
                ) : (
                  <BookOpen className="size-4" />
                )
              }
              onClick={() => {
                if (decision === 'shouldLearn') return

                markEntry({
                  entry: selectedEntry,
                  source: 'dictionary',
                  status: 'shouldLearn',
                })
              }}
              tone={decision === 'alreadyKnow' ? 'paper' : 'primary'}
            >
              {vocab.marks.shouldLearn}
            </ActionButton>
            <ActionButton
              aria-pressed={decision === 'alreadyKnow'}
              className={cn(
                '[&>span:last-child]:whitespace-nowrap',
                decision === 'alreadyKnow' && PICKED_CLASS_NAME.alreadyKnow
              )}
              disabled={isLoading || !hasVietnameseMeaning(selectedEntry.entry)}
              icon={
                decision === 'alreadyKnow' ? (
                  <CircleCheck className="size-4" />
                ) : (
                  <Check className="size-4" />
                )
              }
              onClick={() => {
                if (decision === 'alreadyKnow') return

                markEntry({
                  entry: selectedEntry,
                  source: 'dictionary',
                  status: 'alreadyKnow',
                })
              }}
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

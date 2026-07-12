'use client'

import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MetricTile } from '@/components/common/MetricTile'
import { QueueRow } from '@/components/common/QueueRow'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  answerVocabRecallApi,
  getDueVocabRecallApi,
  getExploreVocabApi,
  getVocabStatsApi,
  lookupVocabEntryApi,
  searchVocabApi,
  setVocabItemStatusApi,
} from '@/requests/vocabularyApi'
import type {
  VocabEntryApiRecord,
  VocabEntryWithUserStateRecord,
  VocabRecallCardRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'

interface Props {
  isAdmin: boolean
  mongoConfigured: boolean
}

type ExploreDecision = 'shouldLearn' | 'alreadyKnow'

const EMPTY_STATS: VocabStatsRecord = {
  alreadyKnowCount: 0,
  dailyGrowth: [],
  dueTodayCount: 0,
  learningCount: 0,
  masteredCount: 0,
  totalKnownCount: 0,
  totalStartedCount: 0,
}

function formatDueLabel(card: VocabRecallCardRecord) {
  if (card.item.recallStage >= 7) return 'Final recall'

  return `Stage ${card.item.recallStage}/7`
}

function getDefinitionPreview(entry: VocabEntryApiRecord) {
  return (
    entry.definitions[0]?.definition ??
    entry.localizedMeanings[0]?.meaning ??
    'No definition yet. Lookup or admin enrich can fill this word.'
  )
}

function speakTerm(term: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(term)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

function getExploreDecisionLabel(decision: ExploreDecision | undefined) {
  if (decision === 'shouldLearn') return 'Should learn'
  if (decision === 'alreadyKnow') return 'Already know'

  return 'Unpicked'
}

function getExploreMapClassName({
  active,
  decision,
}: {
  active: boolean
  decision: ExploreDecision | undefined
}) {
  return cn(
    'size-5 border-2 border-manga-black shadow-[2px_2px_0_var(--manga-black)] transition-transform hover:-translate-y-0.5',
    decision === 'shouldLearn' && 'bg-manga-paper-soft',
    decision === 'alreadyKnow' && 'bg-emerald-300',
    !decision && 'bg-manga-white',
    active && 'outline-manga-bright-red scale-110 outline-3 outline-offset-2'
  )
}

function getExploreStackCardClassName({
  active,
  decision,
  visible,
}: {
  active: boolean
  decision: ExploreDecision | undefined
  visible: boolean
}) {
  return cn(
    'border-manga-black absolute top-0 left-1/2 grid h-full min-h-96 w-[min(74vw,760px)] gap-4 border-3 p-4 shadow-[5px_5px_0_var(--manga-black)] transition-[opacity,transform] duration-300 ease-out sm:w-[min(78vw,760px)]',
    decision === 'shouldLearn' && 'bg-manga-paper-soft',
    decision === 'alreadyKnow' && 'bg-emerald-50',
    !decision && 'bg-manga-white',
    !active && 'cursor-pointer hover:opacity-80',
    !visible && 'pointer-events-none opacity-0'
  )
}

export function VocabularyDashboard({ isAdmin, mongoConfigured }: Props) {
  const [stats, setStats] = useState<VocabStatsRecord>(EMPTY_STATS)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    VocabEntryWithUserStateRecord[]
  >([])
  const [selectedEntry, setSelectedEntry] =
    useState<VocabEntryWithUserStateRecord | null>(null)
  const [exploreEntries, setExploreEntries] = useState<
    VocabEntryWithUserStateRecord[]
  >([])
  const [exploreDecisions, setExploreDecisions] = useState<
    Record<string, ExploreDecision>
  >({})
  const [activeExploreIndex, setActiveExploreIndex] = useState(0)
  const [recallCards, setRecallCards] = useState<VocabRecallCardRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const maxGrowth = useMemo(
    () => Math.max(1, ...stats.dailyGrowth.map(point => point.count)),
    [stats.dailyGrowth]
  )

  const refreshProgressData = useCallback(async () => {
    if (!mongoConfigured) return

    const [statsResponse, dueResponse] = await Promise.all([
      getVocabStatsApi(),
      getDueVocabRecallApi({ limit: 12 }),
    ])

    setStats(statsResponse.stats)
    setRecallCards(dueResponse.cards)
  }, [mongoConfigured])

  const refreshExploreData = useCallback(async () => {
    if (!mongoConfigured) return

    const exploreResponse = await getExploreVocabApi({ limit: 18 })

    setExploreEntries(exploreResponse.entries)
    setActiveExploreIndex(0)
  }, [mongoConfigured])

  const refreshCoreData = useCallback(async () => {
    await Promise.all([refreshProgressData(), refreshExploreData()])
  }, [refreshExploreData, refreshProgressData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshCoreData().catch(error => {
        setErrorMessage(
          error instanceof Error ? error.message : 'Could not load vocabulary.'
        )
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshCoreData])

  async function runLookup(term: string) {
    const cleanTerm = term.trim()

    if (!cleanTerm) return

    setIsLoading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const entry = await lookupVocabEntryApi({ term: cleanTerm })
      const results = await searchVocabApi({ query: cleanTerm })

      setSelectedEntry(entry)
      setSearchResults(results.entries)
      setStatusMessage(`Loaded "${entry.entry.term}".`)
      await refreshCoreData()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not lookup this word.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function markEntry({
    entry,
    source,
    status,
  }: {
    entry: VocabEntryWithUserStateRecord
    source: 'search' | 'explore' | 'dictionary' | 'manual'
    status: 'shouldLearn' | 'alreadyKnow'
  }) {
    setIsLoading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const response = await setVocabItemStatusApi({
        source,
        status,
        vocabEntryId: entry.entry.id,
      })
      const nextEntry = {
        ...entry,
        userItem: response.item,
      }

      setSelectedEntry(current =>
        current?.entry.id === entry.entry.id ? nextEntry : current
      )
      setSearchResults(current =>
        current.map(item =>
          item.entry.id === entry.entry.id ? nextEntry : item
        )
      )
      setExploreEntries(current =>
        current.map(item =>
          item.entry.id === entry.entry.id ? nextEntry : item
        )
      )
      setExploreDecisions(current => ({
        ...current,
        [entry.entry.id]: status,
      }))
      setStatusMessage(
        status === 'shouldLearn'
          ? `"${entry.entry.term}" is in your recall queue.`
          : `"${entry.entry.term}" is marked as known.`
      )
      if (source === 'explore')
        window.setTimeout(() => {
          showExploreIndex(activeExploreIndex + 1)
        }, 120)

      if (source === 'explore') await refreshProgressData()
      else await refreshCoreData()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not update this word.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  function showExploreIndex(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), exploreEntries.length - 1)

    setActiveExploreIndex(nextIndex)
  }

  function moveExplore(delta: number) {
    showExploreIndex(activeExploreIndex + delta)
  }

  async function answerRecall(card: VocabRecallCardRecord, correct: boolean) {
    setIsLoading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const response = await answerVocabRecallApi({
        correct,
        itemId: card.item.id,
      })

      if (response.item.status === 'mastered')
        setStatusMessage(
          `Mastered "${card.entry.term}". That one is yours now.`
        )
      else if (correct)
        setStatusMessage(
          `Nice. "${card.entry.term}" moved to stage ${response.item.recallStage}.`
        )
      else setStatusMessage(`"${card.entry.term}" reset to stage 1.`)

      await refreshCoreData()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not answer recall card.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  if (!mongoConfigured)
    return (
      <MangaPanel
        eyebrow="Vocabulary"
        title="Database needed"
      >
        <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
          Set MONGODB_URI on the server, then run the vocabulary seed script to
          start with the NGSL top 1000 word shells.
        </p>
      </MangaPanel>
    )

  const activeRecall = recallCards[0] ?? null
  const progress =
    stats.totalStartedCount === 0
      ? 0
      : Math.round((stats.totalKnownCount / stats.totalStartedCount) * 100)

  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:p-8">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <PageTag tone="red">Vocabulary</PageTag>
            <h1 className="font-sans text-[clamp(1.9rem,5vw,3.8rem)] leading-none font-black wrap-break-word uppercase">
              Vocab Spine
            </h1>
            <p className="text-manga-ink-soft max-w-3xl text-sm leading-6 font-semibold">
              Track known words, pull in free dictionary data, and review the
              words you chose to learn on a seven-touch schedule.
            </p>
          </div>
          {isAdmin ? (
            <MangaButton
              href="/admin/vocab"
              tone="paper"
              icon={<Sparkles className="size-4" />}
            >
              Admin Enrich
            </MangaButton>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricTile
            href="/vocabulary/words?view=learning"
            label="Learning"
            value={String(stats.learningCount)}
          />
          <MetricTile
            href="/vocabulary/words?view=dueToday"
            label="Due Today"
            value={String(stats.dueTodayCount)}
          />
          <MetricTile
            href="/vocabulary/words?view=alreadyKnow"
            label="Already Know"
            value={String(stats.alreadyKnowCount)}
          />
          <MetricTile
            href="/vocabulary/words?view=mastered"
            label="Mastered"
            value={String(stats.masteredCount)}
          />
          <MetricTile
            href="/vocabulary/words?view=knownTotal"
            label="Known Total"
            value={String(stats.totalKnownCount)}
          />
        </div>

        <MangaPanel
          eyebrow="Growth"
          title="Daily word growth"
        >
          <Progress
            value={progress}
            className="border-manga-black bg-manga-paper-soft h-4 rounded-none border-2"
          />
          <div className="grid min-h-32 grid-cols-7 items-end gap-2 sm:grid-cols-14">
            {stats.dailyGrowth.map(point => (
              <div
                key={point.label}
                className="grid min-w-0 gap-1"
              >
                <div
                  className="border-manga-black bg-manga-red min-h-2 border-2"
                  style={{
                    height: `${Math.max(8, (point.count / maxGrowth) * 96)}px`,
                  }}
                  title={`${point.label}: ${point.count}`}
                />
                <span className="text-manga-ink-soft truncate text-center text-[10px] font-black">
                  {point.label}
                </span>
              </div>
            ))}
          </div>
        </MangaPanel>
      </section>

      {errorMessage ? (
        <div className="border-manga-black bg-manga-pale-red border-3 p-3 text-sm font-black">
          {errorMessage}
        </div>
      ) : null}
      {statusMessage ? (
        <div className="border-manga-black bg-manga-white border-3 p-3 text-sm font-black shadow-[3px_3px_0_var(--manga-black)]">
          {statusMessage}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <MangaPanel
          eyebrow="Recall"
          title="Flashcards due"
        >
          {activeRecall ? (
            <div className="grid gap-4">
              <div className="border-manga-black bg-manga-paper-soft grid gap-3 border-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <PageTag tone="ink">{formatDueLabel(activeRecall)}</PageTag>
                  <span className="text-manga-ink-soft text-xs font-black uppercase">
                    {recallCards.length} due
                  </span>
                </div>
                <h2 className="font-sans text-[clamp(2rem,7vw,4rem)] leading-none font-black wrap-break-word">
                  {activeRecall.entry.term}
                </h2>
                <p className="text-manga-ink-soft text-base leading-7 font-semibold">
                  {getDefinitionPreview(activeRecall.entry)}
                </p>
                <div className="flex flex-wrap gap-2">
                  <MangaButton
                    disabled={isLoading}
                    icon={<Check className="size-4" />}
                    onClick={() => answerRecall(activeRecall, true)}
                  >
                    Correct
                  </MangaButton>
                  <MangaButton
                    disabled={isLoading}
                    icon={<RotateCcw className="size-4" />}
                    onClick={() => answerRecall(activeRecall, false)}
                    tone="paper"
                  >
                    Missed
                  </MangaButton>
                  <MangaButton
                    icon={<Volume2 className="size-4" />}
                    onClick={() => speakTerm(activeRecall.entry.term)}
                    tone="ink"
                  >
                    Speak
                  </MangaButton>
                </div>
              </div>
              <div className="grid gap-2">
                {recallCards.slice(1, 5).map(card => (
                  <QueueRow
                    key={card.item.id}
                    meta={formatDueLabel(card)}
                    title={card.entry.term}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
              No flashcards are due. Add words from Search or Explore and they
              will appear here immediately.
            </p>
          )}
        </MangaPanel>

        <MangaPanel
          eyebrow="Dictionary"
          title="Search a word"
        >
          <form
            className="grid gap-3 sm:grid-cols-[1fr_auto]"
            onSubmit={event => {
              event.preventDefault()
              runLookup(query)
            }}
          >
            <Input
              aria-label="Search vocabulary term"
              className="border-manga-black bg-manga-white h-12 rounded-none border-3 px-3 font-sans font-black shadow-[3px_3px_0_var(--manga-black)]"
              onChange={event => setQuery(event.target.value)}
              placeholder="example"
              type="search"
              value={query}
            />
            <MangaButton
              disabled={isLoading}
              icon={<Search className="size-4" />}
              type="submit"
            >
              Lookup
            </MangaButton>
          </form>

          {selectedEntry ? (
            <div className="border-manga-black bg-manga-white grid gap-3 border-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <h3 className="font-sans text-3xl leading-none font-black wrap-break-word">
                    {selectedEntry.entry.term}
                  </h3>
                  <p className="text-manga-ink-soft text-xs font-black uppercase">
                    {selectedEntry.entry.enrichmentStatus}
                    {selectedEntry.entry.partOfSpeech
                      ? ` · ${selectedEntry.entry.partOfSpeech}`
                      : ''}
                  </p>
                </div>
                <MangaButton
                  icon={<Volume2 className="size-4" />}
                  onClick={() => speakTerm(selectedEntry.entry.term)}
                  tone="paper"
                >
                  Speak
                </MangaButton>
              </div>

              <div className="grid gap-2">
                {selectedEntry.entry.definitions.slice(0, 3).map(definition => (
                  <div
                    key={`${definition.partOfSpeech}:${definition.definition}`}
                    className="border-manga-black bg-manga-paper-soft border-2 p-3"
                  >
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
                    This word is saved, but no free provider definition is
                    available yet.
                  </p>
                ) : null}
              </div>

              {selectedEntry.entry.synonyms.length > 0 ? (
                <p className="text-manga-ink-soft text-xs leading-5 font-black">
                  Synonyms:{' '}
                  {selectedEntry.entry.synonyms.slice(0, 8).join(', ')}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <MangaButton
                  disabled={isLoading}
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
                  disabled={isLoading}
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
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="grid gap-2">
              {searchResults.map(result => (
                <QueueRow
                  key={result.entry.id}
                  meta={
                    result.userItem?.status ?? result.entry.enrichmentStatus
                  }
                  title={result.entry.term}
                />
              ))}
            </div>
          ) : null}
        </MangaPanel>
      </section>

      <MangaPanel
        eyebrow="Explore"
        title="Explore Words"
      >
        {exploreEntries.length > 0 ? (
          <div className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <Button
                aria-label="Previous explore word"
                className="border-manga-black bg-manga-white hover:bg-manga-paper-soft size-11 rounded-none border-3 shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-35"
                disabled={activeExploreIndex === 0}
                onClick={() => moveExplore(-1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronLeft
                  aria-hidden="true"
                  className="size-5"
                />
              </Button>
              <span className="text-manga-ink-soft text-xs font-black uppercase">
                {activeExploreIndex + 1}/{exploreEntries.length}
              </span>
              <Button
                aria-label="Next explore word"
                className="border-manga-black bg-manga-white hover:bg-manga-paper-soft size-11 rounded-none border-3 shadow-[3px_3px_0_var(--manga-black)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-35"
                disabled={activeExploreIndex >= exploreEntries.length - 1}
                onClick={() => moveExplore(1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ChevronRight
                  aria-hidden="true"
                  className="size-5"
                />
              </Button>
            </div>

            <div className="relative min-h-96 overflow-hidden px-2 py-2 sm:min-h-[26rem]">
              {exploreEntries.map((entry, index) => {
                const decision = exploreDecisions[entry.entry.id]
                const distance = index - activeExploreIndex
                const visible = Math.abs(distance) <= 2
                const active = distance === 0
                const scale = Math.max(0.78, 1 - Math.abs(distance) * 0.08)
                const opacity = active ? 1 : 0.5
                const translateX = `calc(-50% + ${distance * 104}px)`

                return (
                  <article
                    key={entry.entry.id}
                    aria-label={active ? undefined : `Open ${entry.entry.term}`}
                    aria-hidden={!visible}
                    className={getExploreStackCardClassName({
                      active,
                      decision,
                      visible,
                    })}
                    onClick={active ? undefined : () => showExploreIndex(index)}
                    onKeyDown={
                      active
                        ? undefined
                        : event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              showExploreIndex(index)
                            }
                          }
                    }
                    role={active ? undefined : 'button'}
                    style={{
                      opacity: visible ? opacity : 0,
                      transform: `translateX(${translateX}) scale(${scale})`,
                      zIndex: 20 - Math.abs(distance),
                    }}
                    tabIndex={active || !visible ? undefined : 0}
                  >
                    <div className="grid gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="grid min-w-0 gap-1">
                          <h3 className="font-sans text-[clamp(2rem,7vw,4.5rem)] leading-none font-black wrap-break-word">
                            {entry.entry.term}
                          </h3>
                          <p className="text-manga-ink-soft text-xs font-black uppercase">
                            {getExploreDecisionLabel(decision)}
                          </p>
                        </div>
                        <PageTag tone="pale">
                          #{entry.entry.frequencyRank ?? index + 1}
                        </PageTag>
                      </div>
                      <p className="text-manga-ink-soft max-w-2xl text-base leading-7 font-semibold">
                        {getDefinitionPreview(entry.entry)}
                      </p>
                    </div>
                    {distance === 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        <MangaButton
                          className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                          disabled={isLoading || decision === 'shouldLearn'}
                          icon={<BookOpen className="size-4" />}
                          onClick={() =>
                            markEntry({
                              entry,
                              source: 'explore',
                              status: 'shouldLearn',
                            })
                          }
                        >
                          Should Learn
                        </MangaButton>
                        <MangaButton
                          className="min-w-0 px-2 text-xs sm:px-4 sm:text-sm [&>span:last-child]:whitespace-nowrap"
                          disabled={isLoading || decision === 'alreadyKnow'}
                          icon={<X className="size-4" />}
                          onClick={() =>
                            markEntry({
                              entry,
                              source: 'explore',
                              status: 'alreadyKnow',
                            })
                          }
                          tone="paper"
                        >
                          Already Know
                        </MangaButton>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>

            <div className="border-manga-black bg-manga-paper-soft grid gap-3 border-3 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-manga-ink-soft text-xs font-black uppercase">
                  Explore map
                </span>
                <div
                  aria-label="Explore map color legend"
                  className="flex flex-wrap gap-2"
                >
                  <span
                    aria-label="White means unpicked"
                    className="border-manga-black bg-manga-white size-5 border-2 shadow-[2px_2px_0_var(--manga-black)]"
                    role="img"
                    title="Unpicked"
                  />
                  <span
                    aria-label="Pink means should learn"
                    className="border-manga-black bg-manga-paper-soft size-5 border-2 shadow-[2px_2px_0_var(--manga-black)]"
                    role="img"
                    title="Should learn"
                  />
                  <span
                    aria-label="Green means already know"
                    className="border-manga-black size-5 border-2 bg-emerald-300 shadow-[2px_2px_0_var(--manga-black)]"
                    role="img"
                    title="Already know"
                  />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(1.25rem,1fr))] gap-2">
                {exploreEntries.map((entry, index) => {
                  const decision = exploreDecisions[entry.entry.id]

                  return (
                    <Button
                      key={entry.entry.id}
                      aria-label={`Open ${entry.entry.term}: ${getExploreDecisionLabel(decision)}`}
                      className={getExploreMapClassName({
                        active: index === activeExploreIndex,
                        decision,
                      })}
                      onClick={() => showExploreIndex(index)}
                      size="icon"
                      title={entry.entry.term}
                      type="button"
                      variant="ghost"
                    />
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-manga-ink-soft text-sm leading-6 font-semibold">
            No enriched words are ready to explore yet. Ask an admin to enrich a
            small batch, then refresh this page.
          </p>
        )}
      </MangaPanel>
    </div>
  )
}

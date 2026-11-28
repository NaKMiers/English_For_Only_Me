'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ContentPanel } from '@/components/common/ContentPanel'
import { useClientOutbox } from '@/components/common/OutboxOwnerProvider'
import {
  SkeletonJourney,
  SkeletonPanel,
} from '@/components/common/PageSkeletons'
import { useMessages } from '@/i18n/client'
import { format } from '@/i18n/format'
import {
  VOCAB_EXPLORE_INITIAL_LIMIT,
  VOCAB_EXPLORE_MAX_LIMIT,
  VOCAB_RECALL_DEFAULT_LIMIT,
  VOCAB_RECALL_LISTENING_TASK_TYPES,
} from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
  VocabLearningSource,
  VocabRecallTaskRecord,
  VocabStatsRecord,
  VocabularyDashboardInitialData,
} from '@/modules/vocabulary/types'
import {
  getDueVocabRecallApi,
  getExploreVocabApi,
  getVocabRequestErrorMessage,
  getVocabStatsApi,
  lookupVocabEntryApi,
  searchVocabApi,
} from '@/requests/vocabularyApi'

import { VocabRecallEnd } from './VocabRecallEnd'
import { VocabRecallSessionSummary } from './VocabRecallSessionSummary'
import {
  VocabularyExplorePanel,
  type ExploreDecision,
} from './VocabularyExplorePanel'
import { VOCAB_EXPLORE_ID, VocabularyLanding } from './VocabularyLanding'
import { VocabularySearchPanel } from './VocabularySearchPanel'
import {
  buildOptimisticUserItem,
  createEntryWriteTracker,
  enqueueVocabItemStatus,
  type VocabMarkStatus,
} from './vocabItemWrites'
import {
  createVocabRecallCardResult,
  enqueueVocabRecallAnswer,
  isVocabRecallTaskExpired,
  mergeVocabRecallPage,
  reconcileVocabRecallCardResult,
  shouldPrefetchVocabRecallPage,
  type VocabRecallAnswerInput,
  type VocabRecallCardResult,
} from './vocabRecallSession'

// The recall modal only matters once a session starts, so its code is split
// out and first loads when the learner (or the daily auto-open) opens it.
const VocabRecallModal = dynamic(() =>
  import('./VocabRecallModal').then(module => module.VocabRecallModal)
)

interface Props {
  /** Read on the server so the dashboard paints with data, not a skeleton. */
  initialData?: VocabularyDashboardInitialData | null
  mongoConfigured: boolean
}

const EMPTY_STATS: VocabStatsRecord = {
  alreadyKnowCount: 0,
  accuracyPercent: 0,
  activeStreakDays: 0,
  dailyGrowth: [],
  dueTodayCount: 0,
  hardestWords: [],
  learnedTodayCount: 0,
  learningCount: 0,
  masteredCount: 0,
  overdueCount: 0,
  reviewsTodayCount: 0,
  totalKnownCount: 0,
  totalStartedCount: 0,
}

const LISTENING_SKIP_STORAGE_KEY = 'vocab:recall:listening-skip-until'
const DAILY_AUTO_OPEN_STORAGE_KEY = 'vocab:recall:auto-open-date'

// Marks land through the outbox one by one; the heavier stats + due refresh
// waits until presses pause and every queued write has reached the server.
const PROGRESS_REFRESH_DELAY_MS = 1500

// Offline, or while a lane keeps retrying, the outbox never drains. Refreshes
// that wait on it go ahead after this long so the dashboard never wedges.
export const OUTBOX_IDLE_TIMEOUT_MS = 8000

interface EntrySnapshot {
  decision: ExploreDecision | undefined
  userItem: UserVocabItemApiRecord | null
}

function getTodayStorageLabel() {
  return new Date().toISOString().slice(0, 10)
}

function isListeningSkipped() {
  if (typeof window === 'undefined') return false

  const value = Number(window.localStorage.getItem(LISTENING_SKIP_STORAGE_KEY))

  return Number.isFinite(value) && value > Date.now()
}

function isListeningTask(task: VocabRecallTaskRecord) {
  return VOCAB_RECALL_LISTENING_TASK_TYPES.includes(task.type)
}

function speakTerm(term: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(term)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

/** Append newly fetched Explore cards, keeping the ones already dealt. */
export function mergeExploreEntries(
  current: VocabEntryWithUserStateRecord[],
  incoming: VocabEntryWithUserStateRecord[]
) {
  const known = new Set(current.map(item => item.entry.id))

  return [...current, ...incoming.filter(item => !known.has(item.entry.id))]
}

export function VocabularyDashboard({
  initialData = null,
  mongoConfigured,
}: Props) {
  const vocab = useMessages().vocabulary
  const errorText = vocab.errors
  const outbox = useClientOutbox()
  const [stats, setStats] = useState<VocabStatsRecord>(
    initialData?.stats ?? EMPTY_STATS
  )
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<
    VocabEntryWithUserStateRecord[]
  >([])
  const [selectedEntry, setSelectedEntry] =
    useState<VocabEntryWithUserStateRecord | null>(null)
  const [exploreEntries, setExploreEntries] = useState<
    VocabEntryWithUserStateRecord[]
  >(initialData?.exploreEntries ?? [])
  const [exploreDecisions, setExploreDecisions] = useState<
    Record<string, ExploreDecision>
  >({})
  const [activeExploreIndex, setActiveExploreIndex] = useState(0)
  const [recallTasks, setRecallTasks] = useState<VocabRecallTaskRecord[]>(
    initialData?.due.tasks ?? []
  )
  const [recallCursor, setRecallCursor] = useState<string | null>(
    initialData?.due.nextCursor ?? null
  )
  // Set when fetching the next due page failed; the modal offers a retry.
  const [recallPageError, setRecallPageError] = useState<string | null>(null)
  // Bumped to make the prefetch effect look again after a fetch was dropped
  // or retried: neither changes the cards or the cursor on its own.
  const [recallPageRetry, setRecallPageRetry] = useState(0)
  const [recallModalOpen, setRecallModalOpen] = useState(false)
  const [recallModalMounted, setRecallModalMounted] = useState(false)
  const [recallAnsweredCount, setRecallAnsweredCount] = useState(0)
  const [recallResults, setRecallResults] = useState<VocabRecallCardResult[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(
    mongoConfigured && !initialData
  )
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const itemWritesRef = useRef(createEntryWriteTracker<EntrySnapshot>())
  const progressRefreshTimerRef = useRef<number | null>(null)
  const exploreRefreshRef = useRef(false)
  // Bumped whenever the Explore deck is replaced or topped up, so whichever of
  // the top-up and a new-deck refresh lands second is dropped: the deck never
  // resets under a learner already on the topped-up cards, and a stale top-up
  // never re-deals decided words into a fresh deck.
  const exploreDeckGenerationRef = useRef(0)
  // Recall session bookkeeping that must be read synchronously (a double click
  // lands twice before React re-renders).
  const recallModalOpenRef = useRef(false)
  const recallResultsRef = useRef(new Map<string, VocabRecallCardResult>())
  const answeredItemIdsRef = useRef(new Set<string>())
  const recallPageFetchRef = useRef(false)
  // Bumped whenever the due queue is replaced, so a slow next-page response
  // for the old queue is dropped instead of appended.
  const recallQueueGenerationRef = useRef(0)

  const recallResultsById = useMemo(
    () => Object.fromEntries(recallResults.map(item => [item.taskId, item])),
    [recallResults]
  )

  const reportError = useCallback((error: unknown, fallback: string) => {
    setErrorMessage(getVocabRequestErrorMessage(error, fallback))
  }, [])

  const refreshStats = useCallback(async () => {
    const response = await getVocabStatsApi()

    setStats(response.stats)
  }, [])

  const loadRecallFirstPage = useCallback(
    async ({ whileOpen = false }: { whileOpen?: boolean } = {}) => {
      const generation = ++recallQueueGenerationRef.current
      const page = await getDueVocabRecallApi({
        excludeListening: isListeningSkipped(),
        limit: VOCAB_RECALL_DEFAULT_LIMIT,
      })

      if (generation !== recallQueueGenerationRef.current) return
      // Never swap the cards under a learner in the middle of a session.
      if (recallModalOpenRef.current && !whileOpen) return

      if (whileOpen) {
        // Mid-session: items already answered (their answer may still be on
        // its way) must not be dealt again, so keep the set and skip them.
        const answeredItemIds = answeredItemIdsRef.current

        setRecallTasks(
          page.tasks.filter(task => !answeredItemIds.has(task.item.id))
        )
      } else {
        answeredItemIdsRef.current = new Set()
        setRecallTasks(page.tasks)
      }

      setRecallCursor(page.nextCursor)
      setRecallPageError(null)
    },
    []
  )

  const loadRecallNextPage = useCallback(async (cursor: string) => {
    const generation = recallQueueGenerationRef.current

    recallPageFetchRef.current = true

    try {
      const page = await getDueVocabRecallApi({
        cursor,
        excludeListening: isListeningSkipped(),
        limit: VOCAB_RECALL_DEFAULT_LIMIT,
      })

      if (generation !== recallQueueGenerationRef.current) {
        // The queue was replaced mid-fetch. If that replacement was dropped
        // too, nothing else changes state, so ask the prefetch effect to look
        // at the current cursor again instead of waiting forever.
        setRecallPageRetry(current => current + 1)
        return
      }

      setRecallTasks(current =>
        mergeVocabRecallPage({
          answeredItemIds: answeredItemIdsRef.current,
          current,
          incoming: page.tasks,
        })
      )
      setRecallCursor(page.nextCursor)
      setRecallPageError(null)
    } finally {
      recallPageFetchRef.current = false
    }
  }, [])

  const retryRecallNextPage = useCallback(() => {
    setRecallPageError(null)
    setRecallPageRetry(current => current + 1)
  }, [])

  const refreshRecallWithoutListening = useCallback(async () => {
    const generation = ++recallQueueGenerationRef.current

    setRecallTasks(current => current.filter(task => !isListeningTask(task)))

    const page = await getDueVocabRecallApi({
      excludeListening: true,
      limit: VOCAB_RECALL_DEFAULT_LIMIT,
    })

    if (generation !== recallQueueGenerationRef.current) return

    // Items whose listening card was dropped come back as other card types.
    setRecallTasks(current =>
      mergeVocabRecallPage({
        answeredItemIds: answeredItemIdsRef.current,
        current,
        incoming: page.tasks,
      })
    )
    setRecallCursor(page.nextCursor)
  }, [])

  // Only for a brand-new deck (first load, or every card decided): it starts
  // the deck over at the first card. Marks never call it.
  const refreshExploreData = useCallback(
    async (generation = exploreDeckGenerationRef.current) => {
      const exploreResponse = await getExploreVocabApi({
        limit: VOCAB_EXPLORE_MAX_LIMIT,
      })

      if (generation !== exploreDeckGenerationRef.current) return

      exploreDeckGenerationRef.current += 1
      setExploreEntries(exploreResponse.entries)
      setActiveExploreIndex(0)
    },
    []
  )

  const setEntryUserItem = useCallback(
    (entryId: string, userItem: UserVocabItemApiRecord | null) => {
      const apply = (item: VocabEntryWithUserStateRecord) =>
        item.entry.id === entryId ? { ...item, userItem } : item

      setSelectedEntry(current =>
        current?.entry.id === entryId ? { ...current, userItem } : current
      )
      setSearchResults(current => current.map(apply))
      setExploreEntries(current => current.map(apply))
    },
    []
  )

  const applyEntrySnapshot = useCallback(
    (entryId: string, snapshot: EntrySnapshot) => {
      setEntryUserItem(entryId, snapshot.userItem)
      setExploreDecisions(current => {
        const next = { ...current }

        if (snapshot.decision) next[entryId] = snapshot.decision
        else delete next[entryId]

        return next
      })
    },
    [setEntryUserItem]
  )

  const scheduleProgressRefresh = useCallback(() => {
    if (progressRefreshTimerRef.current)
      window.clearTimeout(progressRefreshTimerRef.current)

    progressRefreshTimerRef.current = window.setTimeout(() => {
      progressRefreshTimerRef.current = null
      outbox
        .whenIdle({ timeoutMs: OUTBOX_IDLE_TIMEOUT_MS })
        .then(() =>
          Promise.all([
            refreshStats(),
            recallModalOpenRef.current ? null : loadRecallFirstPage(),
          ])
        )
        .catch(error => reportError(error, errorText.refreshProgress))
    }, PROGRESS_REFRESH_DELAY_MS)
  }, [errorText, loadRecallFirstPage, outbox, refreshStats, reportError])

  useEffect(
    () => () => {
      if (progressRefreshTimerRef.current)
        window.clearTimeout(progressRefreshTimerRef.current)
    },
    []
  )

  const openRecallModal = useCallback(() => {
    recallModalOpenRef.current = true
    recallResultsRef.current = new Map()
    setRecallResults([])
    setRecallAnsweredCount(0)
    setRecallModalMounted(true)
    setRecallModalOpen(true)

    // A queue rendered long ago can hold cards past their token lifetime: deal
    // fresh ones instead of letting every answer come back "not saved".
    if (recallTasks.some(task => isVocabRecallTaskExpired(task)))
      loadRecallFirstPage({ whileOpen: true }).catch(error =>
        reportError(error, errorText.refreshRecall)
      )
  }, [errorText, loadRecallFirstPage, recallTasks, reportError])

  const closeRecallSession = useCallback(() => {
    recallModalOpenRef.current = false
    setRecallModalOpen(false)

    // Stats refresh once per session, after every queued answer has landed,
    // and the next session starts from a fresh first page.
    outbox
      .whenIdle({ timeoutMs: OUTBOX_IDLE_TIMEOUT_MS })
      .then(() => Promise.all([refreshStats(), loadRecallFirstPage()]))
      .catch(error => reportError(error, errorText.refreshRecall))
  }, [errorText, loadRecallFirstPage, outbox, refreshStats, reportError])

  // Without server data (the server read failed), load in the browser.
  useEffect(() => {
    if (!mongoConfigured || initialData) return

    const timeoutId = window.setTimeout(() => {
      Promise.all([refreshStats(), loadRecallFirstPage(), refreshExploreData()])
        .catch(error => reportError(error, errorText.loadVocabulary))
        .finally(() => setIsInitialLoad(false))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    errorText,
    initialData,
    loadRecallFirstPage,
    mongoConfigured,
    refreshExploreData,
    refreshStats,
    reportError,
  ])

  // The server renders only the first few Explore cards to keep the page
  // small; top the deck up to the full set once the page is interactive.
  // Cards already on screen keep their place, so the learner never jumps.
  useEffect(() => {
    if (
      !initialData ||
      initialData.exploreEntries.length < VOCAB_EXPLORE_INITIAL_LIMIT
    )
      return

    let cancelled = false
    const generation = exploreDeckGenerationRef.current

    getExploreVocabApi({ limit: VOCAB_EXPLORE_MAX_LIMIT })
      .then(response => {
        if (cancelled || generation !== exploreDeckGenerationRef.current) return

        // The deck is still the server-rendered one (the generation matches).
        // Nothing new: leave a pending new-deck refresh to deal the next deck.
        const dealt = new Set(
          initialData.exploreEntries.map(item => item.entry.id)
        )

        if (response.entries.every(item => dealt.has(item.entry.id))) return

        exploreDeckGenerationRef.current += 1
        setExploreEntries(current =>
          mergeExploreEntries(current, response.entries)
        )
      })
      .catch(error => reportError(error, errorText.loadMoreExplore))

    return () => {
      cancelled = true
    }
  }, [errorText, initialData, reportError])

  // The server cannot see the "listening paused" flag (it lives in this
  // browser), so a server-dealt queue may need its listening cards swapped.
  useEffect(() => {
    if (!initialData?.due.tasks.some(isListeningTask) || !isListeningSkipped())
      return

    const timeoutId = window.setTimeout(() => {
      refreshRecallWithoutListening().catch(error =>
        reportError(error, errorText.refreshRecall)
      )
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [errorText, initialData, refreshRecallWithoutListening, reportError])

  useEffect(() => {
    if (recallTasks.length === 0 || recallModalOpen) return

    const today = getTodayStorageLabel()
    const openedDate = window.localStorage.getItem(DAILY_AUTO_OPEN_STORAGE_KEY)

    if (openedDate === today) return

    window.localStorage.setItem(DAILY_AUTO_OPEN_STORAGE_KEY, today)
    const timeoutId = window.setTimeout(() => openRecallModal(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [openRecallModal, recallModalOpen, recallTasks.length])

  // Page the due queue: fetch the next page while 5 cards remain, so the
  // learner never waits at a page boundary.
  // A failed fetch waits for the learner's retry instead of looping; a
  // dropped one bumps `recallPageRetry` so this runs again.
  useEffect(() => {
    if (!mongoConfigured || !recallCursor || recallPageError) return
    if (
      !shouldPrefetchVocabRecallPage({
        isFetching: recallPageFetchRef.current,
        nextCursor: recallCursor,
        remaining: recallTasks.length,
      })
    )
      return

    loadRecallNextPage(recallCursor).catch(error =>
      setRecallPageError(
        getVocabRequestErrorMessage(error, errorText.loadMoreFlashcards)
      )
    )
  }, [
    errorText,
    loadRecallNextPage,
    mongoConfigured,
    recallCursor,
    recallPageError,
    recallPageRetry,
    recallTasks.length,
  ])

  useEffect(() => {
    if (!mongoConfigured || exploreEntries.length === 0) return
    if (exploreRefreshRef.current) return

    const lastIndex = exploreEntries.length - 1
    const lastDecided = Boolean(
      exploreDecisions[exploreEntries[lastIndex].entry.id]
    )
    const allDecided = exploreEntries.every(
      entry => exploreDecisions[entry.entry.id]
    )
    const reachedEnd = activeExploreIndex >= lastIndex

    if (!allDecided && !(reachedEnd && lastDecided)) return

    exploreRefreshRef.current = true

    const generation = exploreDeckGenerationRef.current

    // Wait for queued decisions to land first, or Explore would deal the same
    // still-unclassified words again.
    outbox
      .whenIdle({ timeoutMs: OUTBOX_IDLE_TIMEOUT_MS })
      .then(() => refreshExploreData(generation))
      .catch(error => reportError(error, errorText.loadMoreExplore))
      .finally(() => {
        exploreRefreshRef.current = false
      })
  }, [
    activeExploreIndex,
    errorText,
    exploreDecisions,
    exploreEntries,
    mongoConfigured,
    outbox,
    refreshExploreData,
    reportError,
  ])

  async function runLookup(term: string) {
    const cleanTerm = term.trim()

    if (!cleanTerm) return

    setIsLoading(true)
    setErrorMessage(null)
    setStatusMessage(null)

    try {
      const [entry, results] = await Promise.all([
        lookupVocabEntryApi({ term: cleanTerm }),
        searchVocabApi({ query: cleanTerm }),
      ])

      setSelectedEntry(entry)
      setSearchResults(results.entries)
      setStatusMessage(
        format(vocab.dashboard.loaded, { term: entry.entry.term })
      )
    } catch (error) {
      reportError(error, errorText.lookup)
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
    source: VocabLearningSource
    status: VocabMarkStatus
  }) {
    const entryId = entry.entry.id
    const ticket = itemWritesRef.current.begin(entryId, {
      decision: exploreDecisions[entryId],
      userItem: entry.userItem,
    })

    setErrorMessage(null)
    setStatusMessage(
      status === 'shouldLearn'
        ? format(vocab.dashboard.queued, { term: entry.entry.term })
        : format(vocab.dashboard.markedKnown, { term: entry.entry.term })
    )
    setEntryUserItem(
      entryId,
      buildOptimisticUserItem({ entry, source, status })
    )
    setExploreDecisions(current => ({ ...current, [entryId]: status }))

    if (source === 'explore')
      setActiveExploreIndex(current =>
        Math.min(current + 1, exploreEntries.length - 1)
      )

    const outcome = await enqueueVocabItemStatus(outbox, {
      source,
      status,
      vocabEntryId: entryId,
    })
    const settled = itemWritesRef.current.settle(
      entryId,
      ticket,
      outcome.kind === 'saved'
        ? { kind: 'saved', state: { decision: status, userItem: outcome.item } }
        : outcome
    )

    if (settled.kind === 'ignore') return

    applyEntrySnapshot(entryId, settled.state)

    if (settled.kind === 'rollback' && outcome.kind === 'failed') {
      setStatusMessage(null)
      setErrorMessage(outcome.error)
      return
    }

    scheduleProgressRefresh()
  }

  function showExploreIndex(index: number) {
    const nextIndex = Math.min(Math.max(index, 0), exploreEntries.length - 1)

    setActiveExploreIndex(nextIndex)
  }

  function moveExplore(delta: number) {
    showExploreIndex(activeExploreIndex + delta)
  }

  function answerRecallTask(input: VocabRecallAnswerInput) {
    const existing = recallResultsRef.current.get(input.task.taskId)

    if (existing) return existing

    const result = createVocabRecallCardResult(input)

    recallResultsRef.current.set(result.taskId, result)
    answeredItemIdsRef.current.add(result.itemId)
    setRecallResults(current => [...current, result])

    if (result.saveState === 'saving')
      void enqueueVocabRecallAnswer(outbox, input).then(outcome => {
        setRecallResults(current =>
          current.map(item =>
            item.taskId === result.taskId
              ? reconcileVocabRecallCardResult(item, outcome)
              : item
          )
        )
      })

    return result
  }

  function advanceRecall(task: VocabRecallTaskRecord) {
    // The card itself showed the word's step moving; the page behind the
    // modal gets no per-card messages.
    setRecallTasks(current =>
      current.filter(recallTask => recallTask.taskId !== task.taskId)
    )
    setRecallAnsweredCount(current => current + 1)
  }

  function skipListeningForNow() {
    window.localStorage.setItem(
      LISTENING_SKIP_STORAGE_KEY,
      String(Date.now() + 15 * 60_000)
    )
    setStatusMessage(vocab.dashboard.listeningPaused)
    refreshRecallWithoutListening().catch(error =>
      reportError(error, errorText.refreshRecall)
    )
  }

  if (!mongoConfigured)
    return (
      <ContentPanel
        eyebrow={vocab.page.eyebrow}
        title={vocab.page.dbNeededTitle}
      >
        <p className="text-ink-soft text-sm leading-6 font-normal">
          {vocab.page.dbNeededDashboard}
        </p>
      </ContentPanel>
    )

  if (isInitialLoad)
    return (
      <div className="grid gap-5 px-4 pb-6 md:pr-6 md:pl-0">
        <SkeletonJourney metaphorClassName="h-24" />
        <div className="grid gap-5 xl:grid-cols-2">
          <SkeletonPanel lines={2} />
          <SkeletonPanel lines={4} />
        </div>
      </div>
    )

  const activeRecall = recallTasks[0] ?? null
  const heldRecallTotal = recallAnsweredCount + recallTasks.length
  // With pages still to fetch, the session size comes from the due count.
  const recallTaskTotal = recallCursor
    ? Math.max(heldRecallTotal, stats.dueTodayCount)
    : heldRecallTotal

  return (
    <>
      <VocabularyLanding
        dueCount={
          activeRecall ? Math.max(stats.dueTodayCount, recallTasks.length) : 0
        }
        errorMessage={errorMessage}
        nextTerm={activeRecall?.entry.term ?? null}
        onStartRecall={openRecallModal}
        stats={stats}
        statusMessage={statusMessage}
      >
        {recallModalOpen ? null : (
          <VocabRecallSessionSummary results={recallResults} />
        )}

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <VocabularySearchPanel
            isLoading={isLoading}
            markEntry={markEntry}
            onQueryChange={setQuery}
            query={query}
            runLookup={runLookup}
            searchResults={searchResults}
            selectedEntry={selectedEntry}
            speakTerm={speakTerm}
          />

          <div
            className="scroll-mt-6"
            id={VOCAB_EXPLORE_ID}
          >
            <VocabularyExplorePanel
              activeIndex={activeExploreIndex}
              decisions={exploreDecisions}
              entries={exploreEntries}
              markEntry={markEntry}
              moveExplore={moveExplore}
              showExploreIndex={showExploreIndex}
            />
          </div>
        </div>
      </VocabularyLanding>

      {recallModalMounted ? (
        <VocabRecallModal
          isLoading={isLoading}
          loadError={recallPageError}
          onAdvance={advanceRecall}
          onAnswer={answerRecallTask}
          onListeningSkip={skipListeningForNow}
          onOpenChange={open => {
            if (!open) closeRecallSession()
          }}
          onRetryLoad={retryRecallNextPage}
          endScreen={
            recallTasks.length === 0 && !recallCursor ? (
              <VocabRecallEnd
                knownBefore={stats.totalKnownCount}
                onDone={closeRecallSession}
                onPlant={() => {
                  closeRecallSession()
                  window.requestAnimationFrame(() =>
                    document
                      .getElementById(VOCAB_EXPLORE_ID)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  )
                }}
                results={recallResults}
              />
            ) : null
          }
          open={recallModalOpen}
          results={recallResultsById}
          task={activeRecall}
          taskNumber={activeRecall ? recallAnsweredCount + 1 : 0}
          taskTotal={recallTaskTotal}
        />
      ) : null}
    </>
  )
}

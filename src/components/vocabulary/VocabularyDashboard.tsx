'use client'

import { Flame } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import {
  SkeletonHero,
  SkeletonPanel,
  SkeletonTileRow,
} from '@/components/common/PageSkeletons'
import { PageTag } from '@/components/ui/PageTag'
import {
  VOCAB_API_PATHS,
  VOCAB_EXPLORE_MAX_LIMIT,
  VOCAB_RECALL_LISTENING_TASK_TYPES,
  VOCAB_RECALL_MAX_LIMIT,
} from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
  VocabRecallTaskRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'
import {
  getDueVocabRecallApi,
  getExploreVocabApi,
  getVocabStatsApi,
  lookupVocabEntryApi,
  searchVocabApi,
  setVocabItemStatusApi,
  setVocabItemStatusBatchApi,
} from '@/requests/vocabularyApi'

import { VocabRecallModal } from './VocabRecallModal'
import {
  VocabularyExplorePanel,
  type ExploreDecision,
} from './VocabularyExplorePanel'
import { VocabularyRecallLauncher } from './VocabularyRecallLauncher'
import { VocabularySearchPanel } from './VocabularySearchPanel'
import { VocabularyStatsOverview } from './VocabularyStatsOverview'

interface Props {
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

// Rapid explore decisions are coalesced: presses are queued and sent as one
// batch after the user pauses, and the heavy stats + due-recall refetch waits
// until presses settle. This turns a burst of N presses (N item POSTs + N
// stats + N 80kB due fetches) into ~1 batch write + 1 progress refresh.
const WRITE_FLUSH_DELAY_MS = 2000
const PROGRESS_REFRESH_DELAY_MS = 1500

type MarkableSource = 'search' | 'explore' | 'dictionary' | 'manual'
type MarkableStatus = 'shouldLearn' | 'alreadyKnow'

interface PendingExploreWrite {
  previousDecision: ExploreDecision | undefined
  previousUserItem: UserVocabItemApiRecord | null
  source: MarkableSource
  status: MarkableStatus
}

function getTodayStorageLabel() {
  return new Date().toISOString().slice(0, 10)
}

function isListeningSkipped() {
  if (typeof window === 'undefined') return false

  const value = Number(window.localStorage.getItem(LISTENING_SKIP_STORAGE_KEY))

  return Number.isFinite(value) && value > Date.now()
}

function speakTerm(term: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(term)
  utterance.lang = 'en-US'
  window.speechSynthesis.speak(utterance)
}

function buildOptimisticUserItem({
  entry,
  source,
  status,
}: {
  entry: VocabEntryWithUserStateRecord
  source: MarkableSource
  status: MarkableStatus
}): UserVocabItemApiRecord {
  const now = new Date()
  const existingItem = entry.userItem
  const base = {
    correctCount: existingItem?.correctCount ?? 0,
    createdAt: existingItem?.createdAt ?? now,
    firstSeenAt: existingItem?.firstSeenAt ?? now,
    id: existingItem?.id ?? `optimistic-${entry.entry.id}`,
    lastReviewedAt: existingItem?.lastReviewedAt ?? null,
    notes: existingItem?.notes ?? null,
    reviewCount: existingItem?.reviewCount ?? 0,
    source,
    updatedAt: now,
    userId: existingItem?.userId ?? 'optimistic',
    vocabEntryId: entry.entry.id,
    wrongCount: existingItem?.wrongCount ?? 0,
  }

  if (status === 'shouldLearn')
    return {
      ...base,
      correctCount: 0,
      dueAt: now,
      knownAt: null,
      knownReason: null,
      masteredAt: null,
      masteredReason: null,
      recallStage: 1,
      reviewCount: 0,
      status: 'learning',
      wrongCount: 0,
    }

  return {
    ...base,
    dueAt: null,
    knownAt: now,
    knownReason: 'manual',
    masteredAt: null,
    masteredReason: null,
    recallStage: 1,
    status: 'alreadyKnow',
  }
}

export function VocabularyDashboard({ mongoConfigured }: Props) {
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
  const [pendingExploreDecisions, setPendingExploreDecisions] = useState<
    Record<string, ExploreDecision>
  >({})
  const [activeExploreIndex, setActiveExploreIndex] = useState(0)
  const [recallTasks, setRecallTasks] = useState<VocabRecallTaskRecord[]>([])
  const [recallModalOpen, setRecallModalOpen] = useState(false)
  const [recallAnsweredCount, setRecallAnsweredCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(mongoConfigured)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Queued explore writes keyed by entry id (last decision per entry wins),
  // plus the debounce timers for flushing them and for the progress refresh.
  const pendingWritesRef = useRef<Map<string, PendingExploreWrite>>(new Map())
  const writeFlushTimerRef = useRef<number | null>(null)
  const progressRefreshTimerRef = useRef<number | null>(null)

  const refreshProgressData = useCallback(async () => {
    if (!mongoConfigured) return

    const [statsResponse, dueResponse] = await Promise.all([
      getVocabStatsApi(),
      getDueVocabRecallApi({
        excludeListening: isListeningSkipped(),
        limit: VOCAB_RECALL_MAX_LIMIT,
      }),
    ])

    setStats(statsResponse.stats)
    setRecallTasks(dueResponse.tasks)
  }, [mongoConfigured])

  const refreshExploreData = useCallback(async () => {
    if (!mongoConfigured) return

    const exploreResponse = await getExploreVocabApi({
      limit: VOCAB_EXPLORE_MAX_LIMIT,
    })

    setExploreEntries(exploreResponse.entries)
    setActiveExploreIndex(0)
  }, [mongoConfigured])

  const refreshCoreData = useCallback(async () => {
    await Promise.all([refreshProgressData(), refreshExploreData()])
  }, [refreshExploreData, refreshProgressData])

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

  const rollbackEntry = useCallback(
    (entryId: string, write: PendingExploreWrite) => {
      setEntryUserItem(entryId, write.previousUserItem)
      setExploreDecisions(current => {
        const next = { ...current }

        if (write.previousDecision) next[entryId] = write.previousDecision
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
      refreshProgressData().catch(error => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not refresh vocabulary progress.'
        )
      })
    }, PROGRESS_REFRESH_DELAY_MS)
  }, [refreshProgressData])

  const flushPendingWrites = useCallback(async () => {
    if (writeFlushTimerRef.current) {
      window.clearTimeout(writeFlushTimerRef.current)
      writeFlushTimerRef.current = null
    }

    const snapshot = [...pendingWritesRef.current.entries()]

    if (snapshot.length === 0) return

    pendingWritesRef.current = new Map()

    const updates = snapshot.map(([vocabEntryId, write]) => ({
      source: write.source,
      status: write.status,
      vocabEntryId,
    }))

    try {
      const { results } = await setVocabItemStatusBatchApi({ updates })
      const resultByEntryId = new Map(
        results.map(result => [result.vocabEntryId, result])
      )
      let firstError: string | null = null

      for (const [entryId, write] of snapshot) {
        const result = resultByEntryId.get(entryId)

        if (result?.item) setEntryUserItem(entryId, result.item)
        else {
          rollbackEntry(entryId, write)
          if (!firstError)
            firstError = result?.error ?? 'Could not update this word.'
        }
      }

      if (firstError) setErrorMessage(firstError)

      scheduleProgressRefresh()
    } catch (error) {
      for (const [entryId, write] of snapshot) rollbackEntry(entryId, write)

      setErrorMessage(
        error instanceof Error ? error.message : 'Could not update these words.'
      )
    } finally {
      setPendingExploreDecisions(current => {
        const next = { ...current }

        for (const [entryId] of snapshot) delete next[entryId]

        return next
      })
    }
  }, [rollbackEntry, scheduleProgressRefresh, setEntryUserItem])

  const scheduleWriteFlush = useCallback(() => {
    if (writeFlushTimerRef.current)
      window.clearTimeout(writeFlushTimerRef.current)

    writeFlushTimerRef.current = window.setTimeout(() => {
      writeFlushTimerRef.current = null
      flushPendingWrites().catch(() => {})
    }, WRITE_FLUSH_DELAY_MS)
  }, [flushPendingWrites])

  // Never drop queued decisions when the user navigates away or backgrounds the
  // tab: flush them with sendBeacon (fire-and-forget) so the writes still land.
  useEffect(() => {
    function flushViaBeacon() {
      if (writeFlushTimerRef.current) {
        window.clearTimeout(writeFlushTimerRef.current)
        writeFlushTimerRef.current = null
      }

      const snapshot = [...pendingWritesRef.current.entries()]

      if (snapshot.length === 0) return

      pendingWritesRef.current = new Map()

      const payload = JSON.stringify({
        updates: snapshot.map(([vocabEntryId, write]) => ({
          source: write.source,
          status: write.status,
          vocabEntryId,
        })),
      })

      if (typeof navigator !== 'undefined' && navigator.sendBeacon)
        navigator.sendBeacon(
          VOCAB_API_PATHS.itemsBatch,
          new Blob([payload], { type: 'application/json' })
        )
      else
        fetch(VOCAB_API_PATHS.itemsBatch, {
          body: payload,
          headers: { 'content-type': 'application/json' },
          keepalive: true,
          method: 'POST',
        }).catch(() => {})
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushViaBeacon()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', flushViaBeacon)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', flushViaBeacon)
      flushViaBeacon()
    }
  }, [])

  const openRecallModal = useCallback(() => {
    setRecallAnsweredCount(0)
    setRecallModalOpen(true)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshCoreData()
        .catch(error => {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Could not load vocabulary.'
          )
        })
        .finally(() => setIsInitialLoad(false))
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [refreshCoreData])

  useEffect(() => {
    if (recallTasks.length === 0 || recallModalOpen) return

    const today = getTodayStorageLabel()
    const openedDate = window.localStorage.getItem(DAILY_AUTO_OPEN_STORAGE_KEY)

    if (openedDate === today) return

    window.localStorage.setItem(DAILY_AUTO_OPEN_STORAGE_KEY, today)
    const timeoutId = window.setTimeout(() => openRecallModal(), 0)

    return () => window.clearTimeout(timeoutId)
  }, [openRecallModal, recallModalOpen, recallTasks.length])

  useEffect(() => {
    if (!mongoConfigured || exploreEntries.length === 0) return
    if (Object.keys(pendingExploreDecisions).length > 0) return

    const lastIndex = exploreEntries.length - 1
    const lastDecided = Boolean(
      exploreDecisions[exploreEntries[lastIndex].entry.id]
    )
    const allDecided = exploreEntries.every(
      entry => exploreDecisions[entry.entry.id]
    )
    const reachedEnd = activeExploreIndex >= lastIndex

    if (!allDecided && !(reachedEnd && lastDecided)) return

    const timeoutId = window.setTimeout(() => {
      refreshExploreData().catch(error => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Could not load more explore words.'
        )
      })
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [
    activeExploreIndex,
    exploreDecisions,
    exploreEntries,
    mongoConfigured,
    pendingExploreDecisions,
    refreshExploreData,
  ])

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
    source: MarkableSource
    status: MarkableStatus
  }) {
    if (source === 'explore') {
      const entryId = entry.entry.id

      if (pendingExploreDecisions[entryId]) return

      const previousDecision = exploreDecisions[entryId]
      const previousUserItem = entry.userItem

      setErrorMessage(null)
      setStatusMessage(
        status === 'shouldLearn'
          ? `"${entry.entry.term}" is in your recall queue.`
          : `"${entry.entry.term}" is marked as known.`
      )
      setPendingExploreDecisions(current => ({
        ...current,
        [entryId]: status,
      }))
      setEntryUserItem(
        entryId,
        buildOptimisticUserItem({ entry, source, status })
      )
      setExploreDecisions(current => ({
        ...current,
        [entryId]: status,
      }))
      setActiveExploreIndex(current =>
        Math.min(current + 1, exploreEntries.length - 1)
      )

      // Queue the write instead of firing per press. Keep the earliest captured
      // previous state so a rollback restores where the entry started, even if
      // the user toggles it several times before the batch flushes.
      const existing = pendingWritesRef.current.get(entryId)

      pendingWritesRef.current.set(entryId, {
        previousDecision: existing ? existing.previousDecision : previousDecision,
        previousUserItem: existing ? existing.previousUserItem : previousUserItem,
        source,
        status,
      })
      scheduleWriteFlush()

      return
    }

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
      await refreshCoreData()
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

  async function handleRecallAnswered({
    isCorrect,
    item,
    task,
  }: {
    isCorrect: boolean
    item: VocabRecallTaskRecord['item']
    task: VocabRecallTaskRecord
  }) {
    const remainingTasks = recallTasks.filter(
      recallTask => recallTask.taskId !== task.taskId
    )

    if (item.status === 'mastered')
      setStatusMessage(`Mastered "${task.entry.term}". That one is yours now.`)
    else if (isCorrect)
      setStatusMessage(
        `Nice. "${task.entry.term}" moved to stage ${item.recallStage}.`
      )
    else setStatusMessage(`"${task.entry.term}" reset to stage 1.`)

    setRecallTasks(remainingTasks)
    setRecallAnsweredCount(current => current + 1)

    if (remainingTasks.length === 0) {
      setRecallModalOpen(false)
      await refreshCoreData()
      return
    }

    const statsResponse = await getVocabStatsApi()

    setStats(statsResponse.stats)
  }

  function skipListeningForNow() {
    window.localStorage.setItem(
      LISTENING_SKIP_STORAGE_KEY,
      String(Date.now() + 15 * 60_000)
    )
    setStatusMessage('Listening flashcards are paused for 15 minutes.')
    setRecallTasks(current =>
      current.filter(
        task => !VOCAB_RECALL_LISTENING_TASK_TYPES.includes(task.type)
      )
    )
    refreshProgressData().catch(error => {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not refresh recall.'
      )
    })
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

  if (isInitialLoad)
    return (
      <div className="grid gap-5 p-4 sm:p-6 lg:p-8">
        <SkeletonHero />
        <SkeletonTileRow count={5} />
        <SkeletonPanel lines={3} />
        <SkeletonPanel lines={2} />
      </div>
    )

  const activeRecall = recallTasks[0] ?? null

  return (
    <div className="grid gap-5 p-4 sm:p-6 lg:p-8">
      <section className="page-hero grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 flex-1 gap-2">
            <PageTag tone="red">Vocabulary</PageTag>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h1 className="font-sans text-[clamp(1.9rem,5vw,3.8rem)] leading-none font-black wrap-break-word uppercase">
                Vocab Spine
              </h1>
              <div className="border-manga-black bg-manga-black text-manga-white ml-auto flex items-center gap-2 border-3 px-3 py-2 shadow-[4px_4px_0_var(--manga-red)]">
                <Flame className="text-manga-red size-7 fill-current" />
                <span className="text-xs font-black uppercase">Streak</span>
                <strong className="font-sans text-2xl leading-none font-black">
                  {stats.activeStreakDays}
                </strong>
              </div>
            </div>
            <p className="text-manga-ink-soft max-w-3xl text-sm leading-6 font-semibold">
              Track known words, pull in free dictionary data, and review the
              words you chose to learn on a seven-touch schedule.
            </p>
          </div>
        </div>

        <VocabularyStatsOverview stats={stats} />

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

      <VocabularyRecallLauncher
        onOpenRecall={openRecallModal}
        tasks={recallTasks}
      />

      <VocabularyExplorePanel
        activeIndex={activeExploreIndex}
        decisions={exploreDecisions}
        entries={exploreEntries}
        markEntry={markEntry}
        moveExplore={moveExplore}
        pendingDecisions={pendingExploreDecisions}
        showExploreIndex={showExploreIndex}
      />

      <VocabRecallModal
        isLoading={isLoading}
        onAnswered={handleRecallAnswered}
        onError={setErrorMessage}
        onListeningSkip={skipListeningForNow}
        onOpenChange={setRecallModalOpen}
        open={recallModalOpen}
        task={activeRecall}
        taskNumber={recallTasks.length > 0 ? recallAnsweredCount + 1 : 0}
        taskTotal={recallAnsweredCount + recallTasks.length}
      />
    </div>
  )
}

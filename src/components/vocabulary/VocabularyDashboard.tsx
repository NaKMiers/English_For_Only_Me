'use client'

import { Flame, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { MangaPanel } from '@/components/common/MangaPanel'
import { MangaButton } from '@/components/ui/MangaButton'
import { PageTag } from '@/components/ui/PageTag'
import {
  getDueVocabRecallApi,
  getExploreVocabApi,
  getVocabStatsApi,
  lookupVocabEntryApi,
  searchVocabApi,
  setVocabItemStatusApi,
} from '@/requests/vocabularyApi'
import { VOCAB_RECALL_LISTENING_TASK_TYPES } from '@/modules/vocabulary/constants'
import type {
  UserVocabItemApiRecord,
  VocabEntryWithUserStateRecord,
  VocabRecallTaskRecord,
  VocabStatsRecord,
} from '@/modules/vocabulary/types'

import {
  VocabularyExplorePanel,
  type ExploreDecision,
} from './VocabularyExplorePanel'
import { VocabularyRecallLauncher } from './VocabularyRecallLauncher'
import { VocabRecallModal } from './VocabRecallModal'
import { VocabularySearchPanel } from './VocabularySearchPanel'
import { VocabularyStatsOverview } from './VocabularyStatsOverview'

interface Props {
  isAdmin: boolean
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

type MarkableSource = 'search' | 'explore' | 'dictionary' | 'manual'
type MarkableStatus = 'shouldLearn' | 'alreadyKnow'

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
  const [pendingExploreDecisions, setPendingExploreDecisions] = useState<
    Record<string, ExploreDecision>
  >({})
  const [activeExploreIndex, setActiveExploreIndex] = useState(0)
  const [recallTasks, setRecallTasks] = useState<VocabRecallTaskRecord[]>([])
  const [recallModalOpen, setRecallModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const refreshProgressData = useCallback(async () => {
    if (!mongoConfigured) return

    const [statsResponse, dueResponse] = await Promise.all([
      getVocabStatsApi(),
      getDueVocabRecallApi({
        excludeListening: isListeningSkipped(),
        limit: 20,
      }),
    ])

    setStats(statsResponse.stats)
    setRecallTasks(dueResponse.tasks)
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

  useEffect(() => {
    if (recallTasks.length === 0 || recallModalOpen) return

    const today = getTodayStorageLabel()
    const openedDate = window.localStorage.getItem(DAILY_AUTO_OPEN_STORAGE_KEY)

    if (openedDate === today) return

    window.localStorage.setItem(DAILY_AUTO_OPEN_STORAGE_KEY, today)
    const timeoutId = window.setTimeout(() => setRecallModalOpen(true), 0)

    return () => window.clearTimeout(timeoutId)
  }, [recallModalOpen, recallTasks.length])

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
      const optimisticEntry = {
        ...entry,
        userItem: buildOptimisticUserItem({
          entry,
          source,
          status,
        }),
      }

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
      setSelectedEntry(current =>
        current?.entry.id === entryId ? optimisticEntry : current
      )
      setSearchResults(current =>
        current.map(item =>
          item.entry.id === entryId ? optimisticEntry : item
        )
      )
      setExploreEntries(current =>
        current.map(item =>
          item.entry.id === entryId ? optimisticEntry : item
        )
      )
      setExploreDecisions(current => ({
        ...current,
        [entryId]: status,
      }))
      setActiveExploreIndex(current =>
        Math.min(current + 1, exploreEntries.length - 1)
      )

      setVocabItemStatusApi({
        source,
        status,
        vocabEntryId: entryId,
      })
        .then(response => {
          const nextEntry = {
            ...entry,
            userItem: response.item,
          }

          setSelectedEntry(current =>
            current?.entry.id === entryId ? nextEntry : current
          )
          setSearchResults(current =>
            current.map(item => (item.entry.id === entryId ? nextEntry : item))
          )
          setExploreEntries(current =>
            current.map(item => (item.entry.id === entryId ? nextEntry : item))
          )
          refreshProgressData().catch(error => {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Could not refresh vocabulary progress.'
            )
          })
        })
        .catch(error => {
          const rollbackEntry = {
            ...entry,
            userItem: previousUserItem,
          }

          setSelectedEntry(current =>
            current?.entry.id === entryId ? rollbackEntry : current
          )
          setSearchResults(current =>
            current.map(item =>
              item.entry.id === entryId ? rollbackEntry : item
            )
          )
          setExploreEntries(current =>
            current.map(item =>
              item.entry.id === entryId ? rollbackEntry : item
            )
          )
          setExploreDecisions(current => {
            const next = { ...current }

            if (previousDecision) next[entryId] = previousDecision
            else delete next[entryId]

            return next
          })
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Could not update this word.'
          )
        })
        .finally(() => {
          setPendingExploreDecisions(current => {
            const next = { ...current }

            delete next[entryId]

            return next
          })
        })

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
        onOpenRecall={() => setRecallModalOpen(true)}
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
        taskNumber={recallTasks.length > 0 ? 1 : 0}
        taskTotal={recallTasks.length}
      />
    </div>
  )
}

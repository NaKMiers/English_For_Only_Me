import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { createOutbox, type Outbox } from '@/lib/sync/outbox'
import type {
  UserVocabItemApiRecord,
  VocabEntryApiRecord,
  VocabRecallTaskRecord,
  VocabStatsRecord,
  VocabularyDashboardInitialData,
} from '@/modules/vocabulary/types'

import {
  OUTBOX_IDLE_TIMEOUT_MS,
  VocabularyDashboard,
} from './VocabularyDashboard'

const mocks = vi.hoisted(() => ({
  getDueVocabRecallApi: vi.fn(),
  getExploreVocabApi: vi.fn(),
  getVocabStatsApi: vi.fn(),
  lookupVocabEntryApi: vi.fn(),
  outbox: { current: null as Outbox | null },
  searchVocabApi: vi.fn(),
}))

vi.mock('@/requests/vocabularyApi', () => ({
  getDueVocabRecallApi: mocks.getDueVocabRecallApi,
  getExploreVocabApi: mocks.getExploreVocabApi,
  getVocabStatsApi: mocks.getVocabStatsApi,
  lookupVocabEntryApi: mocks.lookupVocabEntryApi,
  searchVocabApi: mocks.searchVocabApi,
}))

vi.mock('@/components/common/OutboxOwnerProvider', () => ({
  useClientOutbox: () => mocks.outbox.current,
}))

// A fetch double for the outbox whose responses each test releases, so the UI
// can be asserted before and after the server answers.
function createControlledFetch() {
  const calls: Array<{
    body: Record<string, unknown>
    headers: Record<string, string>
    resolve: (status: number, data?: unknown) => void
    url: string
  }> = []
  const fetchImpl = vi.fn(
    (url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>(resolve => {
        calls.push({
          body: init?.body ? JSON.parse(String(init.body)) : {},
          headers: (init?.headers ?? {}) as Record<string, string>,
          resolve: (status, data = {}) =>
            resolve(new Response(JSON.stringify(data), { status })),
          url: String(url),
        })
      })
  )

  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch }
}

const STATS: VocabStatsRecord = {
  accuracyPercent: 0,
  activeStreakDays: 0,
  alreadyKnowCount: 0,
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

const NOW = new Date('2026-01-01T00:00:00.000Z')

function makeEntryRecord(id: string, term: string): VocabEntryApiRecord {
  return {
    antonyms: [],
    audioUrls: [],
    createdAt: NOW,
    definitions: [
      {
        antonyms: [],
        definition: `${term} definition`,
        example: null,
        partOfSpeech: null,
        source: 'test',
        synonyms: [],
      },
    ],
    difficultyLevel: null,
    enrichmentAttempts: 1,
    enrichmentStatus: 'ready',
    entryType: 'word',
    examples: [],
    frequencyRank: Number(id),
    id,
    language: 'en',
    lastEnrichedAt: NOW,
    lemma: null,
    license: null,
    localizedMeanings: [
      {
        language: 'vi',
        license: null,
        meaning: `${term} vi`,
        partOfSpeech: null,
        source: 'test',
      },
    ],
    normalizedTerm: term,
    partOfSpeech: null,
    phonetics: [],
    providerErrors: [],
    relatedWords: [],
    sourceAttributions: [],
    synonyms: [],
    term,
    updatedAt: NOW,
  }
}

function makeEntry(id: string, term: string) {
  return { entry: makeEntryRecord(id, term), userItem: null }
}

function makeItem(id: string, entryId: string): UserVocabItemApiRecord {
  return {
    correctCount: 0,
    createdAt: NOW,
    dueAt: NOW,
    firstSeenAt: NOW,
    id,
    knownAt: null,
    knownReason: null,
    lastReviewedAt: null,
    masteredAt: null,
    masteredReason: null,
    notes: null,
    recallStage: 2,
    reviewCount: 1,
    source: 'explore',
    status: 'learning',
    updatedAt: NOW,
    userId: 'user',
    vocabEntryId: entryId,
    wrongCount: 0,
  }
}

function makeToken(payload: Record<string, unknown>) {
  const encoded = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  return `${encoded}.signature`
}

function makeTask(index: number): VocabRecallTaskRecord {
  const entryId = `entry-${index}`
  const taskId = `task-${index}`
  const term = `word${index}`

  return {
    entry: makeEntryRecord(entryId, term),
    exampleSentence: null,
    item: makeItem(`item-${index}`, entryId),
    options: [
      { definition: null, id: `word:${entryId}`, term },
      { definition: null, id: 'word:other', term: 'other' },
    ],
    taskId,
    token: makeToken({
      correctAnswer: `word:${entryId}`,
      correctOptionId: `word:${entryId}`,
      entryId,
      expiresAt: Date.now() + 30 * 60_000,
      itemId: `item-${index}`,
      recallStage: 2,
      taskId,
      type: 'definitionChooseWord',
    }),
    type: 'definitionChooseWord',
  }
}

function makeListeningTask(index: number): VocabRecallTaskRecord {
  const task = makeTask(index)

  return { ...task, taskId: `listen-${index}`, type: 'listenChooseWord' }
}

function makeDeck(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, offset) =>
    makeEntry(String(from + offset), `term${from + offset}`)
  )
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>(settle => {
    resolve = settle
  })

  return { promise, resolve }
}

function makeInitialData({
  nextCursor = null,
  taskCount = 0,
}: {
  nextCursor?: string | null
  taskCount?: number
} = {}): VocabularyDashboardInitialData {
  return {
    due: {
      nextCursor,
      tasks: Array.from({ length: taskCount }, (_, index) =>
        makeTask(index + 1)
      ),
    },
    exploreEntries: [makeEntry('1', 'expect'), makeEntry('2', 'turbulent')],
    stats: { ...STATS, dueTodayCount: taskCount },
  }
}

let controlled: ReturnType<typeof createControlledFetch>

// jsdom here ships without a usable localStorage, so install a memory one.
function installMemoryStorage() {
  const values = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, value),
    },
  })
}

describe('VocabularyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installMemoryStorage()
    // Mark recall as already auto-opened today unless a test opts in.
    window.localStorage.setItem(
      'vocab:recall:auto-open-date',
      new Date().toISOString().slice(0, 10)
    )
    controlled = createControlledFetch()
    mocks.outbox.current = createOutbox({
      fetchImpl: controlled.fetchImpl,
      owner: 'test',
      retryBaseDelayMs: 1,
    })
    mocks.getDueVocabRecallApi.mockResolvedValue({
      nextCursor: null,
      tasks: [],
    })
    mocks.getExploreVocabApi.mockResolvedValue({
      entries: [makeEntry('1', 'expect'), makeEntry('2', 'turbulent')],
    })
    mocks.getVocabStatsApi.mockResolvedValue({ stats: STATS })
  })

  test('renders server data without fetching it again', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData()}
        mongoConfigured
      />
    )

    expect(screen.getByText('1/2')).toBeInTheDocument()
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(mocks.getVocabStatsApi).not.toHaveBeenCalled()
    expect(mocks.getExploreVocabApi).not.toHaveBeenCalled()
    expect(mocks.getDueVocabRecallApi).not.toHaveBeenCalled()
  })

  test('falls back to loading in the browser without server data', async () => {
    render(<VocabularyDashboard mongoConfigured />)

    await screen.findByText('1/2')
    expect(mocks.getVocabStatsApi).toHaveBeenCalledTimes(1)
    expect(mocks.getExploreVocabApi).toHaveBeenCalledTimes(1)
  })

  test('advances explore cards and queues the write through the outbox', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData()}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Should Learn/i }))

    // Card advances immediately, before the write is answered.
    expect(screen.getByText('2/2')).toBeInTheDocument()
    await waitFor(() => expect(controlled.calls).toHaveLength(1))
    expect(controlled.calls[0].url).toBe('/api/vocab/items')
    expect(controlled.calls[0].body).toEqual({
      source: 'explore',
      status: 'shouldLearn',
      vocabEntryId: '1',
    })
  })

  test('rolls an explore mark back when the server rejects it', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData()}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Should Learn/i }))
    expect(
      screen.getByRole('button', { name: 'Open expect: Should learn' })
    ).toBeInTheDocument()

    await waitFor(() => expect(controlled.calls).toHaveLength(1))
    controlled.calls[0].resolve(409, { message: 'Needs a Vietnamese meaning.' })

    expect(
      await screen.findByText('Needs a Vietnamese meaning.')
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open expect: Unpicked' })
    ).toBeInTheDocument()
  })

  test('grades recall instantly and lets the server verdict win', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData({ taskCount: 1 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    fireEvent.click(await screen.findByRole('button', { name: /other/ }))

    // Local verdict shows before the answer POST resolves.
    expect(
      screen.getByText('Not quite. Check the correct answer, then continue.')
    ).toBeInTheDocument()

    await waitFor(() => expect(controlled.calls).toHaveLength(1))
    controlled.calls[0].resolve(200, {
      attemptId: 'attempt',
      isCorrect: true,
      item: { ...makeItem('item-1', 'entry-1'), recallStage: 3 },
    })

    expect(
      await screen.findByText(
        'Counted as correct after all. Continue when ready.'
      )
    ).toBeInTheDocument()
  })

  test('keeps one idempotency key per recall task across retries', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData({ taskCount: 2 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    const correct = await screen.findByRole('button', { name: /word1/ })

    fireEvent.click(correct)
    await waitFor(() => expect(controlled.calls).toHaveLength(1))
    controlled.calls[0].resolve(503)
    await waitFor(() => expect(controlled.calls).toHaveLength(2))

    const keys = controlled.calls.map(call => call.body.idempotencyKey)

    expect(keys).toEqual(['vocab-recall:task-1', 'vocab-recall:task-1'])
    expect(controlled.calls[1].headers['idempotency-key']).toBe(
      'vocab-recall:task-1'
    )
  })

  test('marks an expired card "not saved" and refreshes stats once on close', async () => {
    render(
      <VocabularyDashboard
        initialData={makeInitialData({ taskCount: 2 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    fireEvent.click(await screen.findByRole('button', { name: /word1/ }))
    await waitFor(() => expect(controlled.calls).toHaveLength(1))
    controlled.calls[0].resolve(409, {
      message: 'This recall card is stale. Refresh recall.',
    })

    fireEvent.click(await screen.findByRole('button', { name: /word2/ }))
    await waitFor(() => expect(controlled.calls).toHaveLength(2))
    expect(mocks.getVocabStatsApi).not.toHaveBeenCalled()
    controlled.calls[1].resolve(200, {
      attemptId: 'attempt-2',
      isCorrect: true,
      item: { ...makeItem('item-2', 'entry-2'), recallStage: 3 },
    })

    expect(await screen.findByText('Session summary')).toBeInTheDocument()
    expect(screen.getByText('1 not saved')).toBeInTheDocument()
    expect(screen.getByText(/expired before it was saved/)).toBeInTheDocument()
    await waitFor(() => expect(mocks.getVocabStatsApi).toHaveBeenCalledTimes(1))
  })

  test('fetches the next due page when five cards remain', async () => {
    mocks.getDueVocabRecallApi.mockResolvedValue({
      nextCursor: null,
      tasks: [makeTask(7)],
    })
    render(
      <VocabularyDashboard
        initialData={makeInitialData({ nextCursor: 'cursor-1', taskCount: 6 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(mocks.getDueVocabRecallApi).not.toHaveBeenCalled()

    fireEvent.click(await screen.findByRole('button', { name: /word1/ }))

    await waitFor(() =>
      expect(mocks.getDueVocabRecallApi).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: 'cursor-1', limit: 20 })
      )
    )
    expect(screen.getByText('Review 2/7')).toBeInTheDocument()
  })

  test('a mid-session refresh of stale cards never re-deals an answered item', async () => {
    const page = deferred<{
      nextCursor: string | null
      tasks: VocabRecallTaskRecord[]
    }>()
    const expired = {
      ...makeTask(2),
      token: makeToken({ expiresAt: Date.now() - 60_000, taskId: 'task-2' }),
    }

    mocks.getDueVocabRecallApi.mockReturnValueOnce(page.promise)
    render(
      <VocabularyDashboard
        initialData={{
          ...makeInitialData(),
          due: { nextCursor: null, tasks: [makeTask(1), expired] },
        }}
        mongoConfigured
      />
    )

    // Opening with a stale card deals a fresh first page in the background.
    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    expect(mocks.getDueVocabRecallApi).toHaveBeenCalledTimes(1)

    // Item 1 is answered before that page lands, and the page re-deals it.
    fireEvent.click(await screen.findByRole('button', { name: /word1/ }))
    await act(async () => {
      page.resolve({
        nextCursor: null,
        tasks: [{ ...makeTask(1), taskId: 'task-1b' }, makeTask(3)],
      })
      await page.promise
    })

    expect(await screen.findByRole('button', { name: /word3/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: /word1/ })).toBeNull()
  })

  test('a failed next-page fetch shows a retry instead of loading forever', async () => {
    mocks.getDueVocabRecallApi
      .mockRejectedValueOnce(new Error('Network down.'))
      .mockResolvedValueOnce({ nextCursor: null, tasks: [makeTask(2)] })
    render(
      <VocabularyDashboard
        initialData={makeInitialData({ nextCursor: 'cursor-1', taskCount: 1 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    await waitFor(() =>
      expect(mocks.getDueVocabRecallApi).toHaveBeenCalledTimes(1)
    )
    fireEvent.click(await screen.findByRole('button', { name: /word1/ }))

    expect(
      await screen.findByText('Could not load more cards')
    ).toBeInTheDocument()
    expect(screen.getByText('Network down.')).toBeInTheDocument()
    expect(screen.queryByText('Loading more cards')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }))

    expect(await screen.findByRole('button', { name: /word2/ })).toBeVisible()
    expect(mocks.getDueVocabRecallApi).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'cursor-1' })
    )
  })

  test('swaps server-dealt listening cards while listening is paused', async () => {
    window.localStorage.setItem(
      'vocab:recall:listening-skip-until',
      String(Date.now() + 60_000)
    )
    // The server re-deals item 1 as a non-listening card.
    mocks.getDueVocabRecallApi.mockResolvedValue({
      nextCursor: null,
      tasks: [makeTask(1)],
    })
    const initialData = makeInitialData()

    initialData.due.tasks = [makeListeningTask(1), makeTask(2)]

    render(
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured
      />
    )

    expect(screen.getByText('Next: word1')).toBeInTheDocument()
    await waitFor(() =>
      expect(mocks.getDueVocabRecallApi).toHaveBeenCalledWith({
        excludeListening: true,
        limit: 20,
      })
    )
    // The listening card is gone and item 1 is back behind item 2.
    expect(await screen.findByText('Next: word2')).toBeInTheDocument()
    expect(screen.getByText('word1')).toBeInTheDocument()
  })

  test('keeps server-dealt listening cards when listening is not paused', async () => {
    const initialData = makeInitialData()

    initialData.due.tasks = [makeListeningTask(1)]

    render(
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured
      />
    )

    await new Promise(resolve => setTimeout(resolve, 20))
    expect(mocks.getDueVocabRecallApi).not.toHaveBeenCalled()
    expect(screen.getByText('Next: word1')).toBeInTheDocument()
  })

  test('tops the server deck up without moving the current card', async () => {
    mocks.getExploreVocabApi.mockResolvedValue({ entries: makeDeck(1, 10) })
    const initialData = makeInitialData()

    initialData.exploreEntries = makeDeck(1, 8)

    render(
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Should Learn' }))
    expect(screen.getByText('2/8')).toBeInTheDocument()

    expect(await screen.findByText('2/10')).toBeInTheDocument()
    expect(mocks.getExploreVocabApi).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'Open term1: Should learn' })
    ).toBeInTheDocument()
  })

  async function decideWholeDeck(count: number) {
    for (let index = 0; index < count; index += 1)
      fireEvent.click(screen.getByRole('button', { name: 'Should Learn' }))

    await waitFor(() =>
      expect(mocks.getExploreVocabApi).toHaveBeenCalledTimes(2)
    )
  }

  test('a top-up that lands after every card is decided wins over the new deck', async () => {
    const topUp = deferred<{ entries: ReturnType<typeof makeDeck> }>()
    const newDeck = deferred<{ entries: ReturnType<typeof makeDeck> }>()

    // The marks themselves are not under test: let them count as landed.
    vi.spyOn(mocks.outbox.current as Outbox, 'whenIdle').mockResolvedValue(true)
    mocks.getExploreVocabApi
      .mockReturnValueOnce(topUp.promise)
      .mockReturnValueOnce(newDeck.promise)
    const initialData = makeInitialData()

    initialData.exploreEntries = makeDeck(1, 8)

    render(
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured
      />
    )

    await decideWholeDeck(8)
    expect(screen.getByText('8/8')).toBeInTheDocument()

    await act(async () => topUp.resolve({ entries: makeDeck(1, 10) }))
    expect(screen.getByText('8/10')).toBeInTheDocument()

    // The new deck arrives later: the learner keeps the topped-up cards.
    await act(async () => newDeck.resolve({ entries: makeDeck(9, 12) }))
    expect(screen.getByText('8/10')).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /^Open term9:/ })
    ).toHaveLength(1)
  })

  test('a stale top-up never re-deals decided words into a new deck', async () => {
    const topUp = deferred<{ entries: ReturnType<typeof makeDeck> }>()
    const newDeck = deferred<{ entries: ReturnType<typeof makeDeck> }>()

    // The marks themselves are not under test: let them count as landed.
    vi.spyOn(mocks.outbox.current as Outbox, 'whenIdle').mockResolvedValue(true)
    mocks.getExploreVocabApi
      .mockReturnValueOnce(topUp.promise)
      .mockReturnValueOnce(newDeck.promise)
    const initialData = makeInitialData()

    initialData.exploreEntries = makeDeck(1, 8)

    render(
      <VocabularyDashboard
        initialData={initialData}
        mongoConfigured
      />
    )

    await decideWholeDeck(8)

    await act(async () => newDeck.resolve({ entries: makeDeck(9, 12) }))
    expect(screen.getByText('1/4')).toBeInTheDocument()

    // Fetched before the decisions landed, so it still holds decided words.
    await act(async () => topUp.resolve({ entries: makeDeck(1, 10) }))
    expect(screen.getByText('1/4')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Open term1:/ })).toBeNull()
  })

  test('deals a new deck even when the outbox never drains', async () => {
    const whenIdle = vi
      .spyOn(mocks.outbox.current as Outbox, 'whenIdle')
      .mockResolvedValue(false)

    mocks.getExploreVocabApi.mockResolvedValue({ entries: makeDeck(3, 4) })

    render(
      <VocabularyDashboard
        initialData={makeInitialData()}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Should Learn' }))
    fireEvent.click(screen.getByRole('button', { name: 'Should Learn' }))

    expect(
      await screen.findByRole('button', { name: 'Open term3: Unpicked' })
    ).toBeInTheDocument()
    expect(whenIdle).toHaveBeenCalledWith({ timeoutMs: OUTBOX_IDLE_TIMEOUT_MS })
  })

  test('refreshes stats after a session even when the outbox never drains', async () => {
    const whenIdle = vi
      .spyOn(mocks.outbox.current as Outbox, 'whenIdle')
      .mockResolvedValue(false)

    render(
      <VocabularyDashboard
        initialData={makeInitialData({ taskCount: 1 })}
        mongoConfigured
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Start Recall/i }))
    // The answer stays queued: the server never replies.
    fireEvent.click(await screen.findByRole('button', { name: /word1/ }))

    await waitFor(() => expect(mocks.getVocabStatsApi).toHaveBeenCalledTimes(1))
    expect(mocks.getDueVocabRecallApi).toHaveBeenCalledTimes(1)
    expect(whenIdle).toHaveBeenCalledWith({ timeoutMs: OUTBOX_IDLE_TIMEOUT_MS })
  })

  test('runs the lookup and the search in parallel', async () => {
    const lookup = deferred<ReturnType<typeof makeEntry>>()
    const search = deferred<{ entries: ReturnType<typeof makeEntry>[] }>()

    mocks.lookupVocabEntryApi.mockReturnValue(lookup.promise)
    mocks.searchVocabApi.mockReturnValue(search.promise)

    render(
      <VocabularyDashboard
        initialData={makeInitialData()}
        mongoConfigured
      />
    )

    fireEvent.change(screen.getByLabelText('Search vocabulary term'), {
      target: { value: ' gleam ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Lookup/i }))

    // Both requests are out before either answers.
    expect(mocks.lookupVocabEntryApi).toHaveBeenCalledWith({ term: 'gleam' })
    expect(mocks.searchVocabApi).toHaveBeenCalledWith({ query: 'gleam' })

    await act(async () => {
      search.resolve({ entries: [makeEntry('9', 'gleam')] })
      lookup.resolve(makeEntry('9', 'gleam'))
    })

    expect(await screen.findByText('Loaded "gleam".')).toBeInTheDocument()
  })
})

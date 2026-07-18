import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import type {
  UserVocabItemApiRecord,
  VocabEntryApiRecord,
} from '@/modules/vocabulary/types'

import { VocabularyDashboard } from './VocabularyDashboard'

const mocks = vi.hoisted(() => {
  let resolveSetStatus:
    ((value: { item: UserVocabItemApiRecord }) => void) | null = null
  const setStatusPromise = new Promise<{ item: UserVocabItemApiRecord }>(
    resolve => {
      resolveSetStatus = resolve
    }
  )

  return {
    getDueVocabRecallApi: vi.fn(),
    getExploreVocabApi: vi.fn(),
    getVocabStatsApi: vi.fn(),
    lookupVocabEntryApi: vi.fn(),
    resolveSetStatus: (item: UserVocabItemApiRecord) =>
      resolveSetStatus?.({ item }),
    searchVocabApi: vi.fn(),
    setStatusPromise,
    setVocabItemStatusApi: vi.fn(),
    setVocabItemStatusBatchApi: vi.fn(),
  }
})

vi.mock('@/requests/vocabularyApi', () => mocks)

function makeEntry(id: string, term: string) {
  const now = new Date('2026-01-01T00:00:00.000Z')
  const entry: VocabEntryApiRecord = {
    antonyms: [],
    audioUrls: [],
    createdAt: now,
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
    lastEnrichedAt: now,
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
    updatedAt: now,
  }

  return {
    entry,
    userItem: null,
  }
}

describe('VocabularyDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDueVocabRecallApi.mockResolvedValue({ tasks: [] })
    mocks.getExploreVocabApi.mockResolvedValue({
      entries: [makeEntry('1', 'expect'), makeEntry('2', 'turbulent')],
    })
    mocks.getVocabStatsApi.mockResolvedValue({
      stats: {
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
      },
    })
    mocks.setVocabItemStatusApi.mockReturnValue(mocks.setStatusPromise)
    // Explore writes are batched + debounced; keep the batch pending so the card
    // advances optimistically without the write resolving.
    mocks.setVocabItemStatusBatchApi.mockReturnValue(new Promise(() => {}))
  })

  test('advances explore cards before the status API resolves', async () => {
    render(<VocabularyDashboard mongoConfigured />)

    await screen.findByText('1/2')

    fireEvent.click(screen.getByRole('button', { name: /Should Learn/i }))

    // Card advances immediately (optimistic), before any write is sent.
    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeInTheDocument()
    })
    expect(mocks.setVocabItemStatusApi).not.toHaveBeenCalled()
  })

  test('batches explore decisions into one debounced request', async () => {
    render(<VocabularyDashboard mongoConfigured />)

    await screen.findByText('1/2')

    fireEvent.click(screen.getByRole('button', { name: /Should Learn/i }))

    // The queued decision flushes as a single batch request after the debounce.
    await waitFor(
      () => {
        expect(mocks.setVocabItemStatusBatchApi).toHaveBeenCalledWith({
          updates: [
            { source: 'explore', status: 'shouldLearn', vocabEntryId: '1' },
          ],
        })
      },
      { timeout: 4000 }
    )
    expect(mocks.setVocabItemStatusBatchApi).toHaveBeenCalledTimes(1)
  })
})

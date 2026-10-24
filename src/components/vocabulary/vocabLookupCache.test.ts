import { beforeEach, describe, expect, test, vi } from 'vitest'

import type { Outbox } from '@/lib/sync/outbox'
import type {
  VocabEntryWithUserStateRecord,
  VocabRecallTaskRecord,
} from '@/modules/vocabulary/types'

import { enqueueVocabItemStatus } from './vocabItemWrites'
import {
  clearVocabLookupCache,
  invalidateCachedVocabEntry,
  lookupVocabEntryCached,
  readCachedVocabLookup,
  updateCachedVocabUserItem,
  VOCAB_LOOKUP_CACHE_TTL_MS,
  writeCachedVocabLookup,
} from './vocabLookupCache'
import { enqueueVocabRecallAnswer } from './vocabRecallSession'

const mocks = vi.hoisted(() => ({
  lookupVocabEntryApi: vi.fn(),
  recordVocabOccurrenceApi: vi.fn(),
}))

vi.mock('@/requests/vocabularyApi', () => mocks)

const RECORD = {
  entry: { id: 'entry-1', term: 'expect' },
  userItem: null,
} as unknown as VocabEntryWithUserStateRecord

const OCCURRENCE = {
  contextSentence: 'I expect rain.',
  reason: 'clickedInAnswer' as const,
  selectedText: 'expect',
}

describe('quick lookup cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearVocabLookupCache()
    mocks.lookupVocabEntryApi.mockResolvedValue(RECORD)
    mocks.recordVocabOccurrenceApi.mockResolvedValue({ ok: true })
  })

  test('a repeat lookup is served from memory and still records one occurrence', async () => {
    await lookupVocabEntryCached({
      occurrence: OCCURRENCE,
      owner: 'user-a',
      term: 'expect',
    })
    const second = await lookupVocabEntryCached({
      occurrence: OCCURRENCE,
      owner: 'user-a',
      term: 'Expect',
    })

    expect(second).toBe(RECORD)
    expect(mocks.lookupVocabEntryApi).toHaveBeenCalledTimes(1)
    // The first lookup records its occurrence server side; the cached one
    // sends exactly one separate occurrence write.
    expect(mocks.recordVocabOccurrenceApi).toHaveBeenCalledTimes(1)
    expect(mocks.recordVocabOccurrenceApi).toHaveBeenCalledWith({
      occurrence: OCCURRENCE,
      vocabEntryId: 'entry-1',
    })
  })

  test('is keyed per learner', async () => {
    await lookupVocabEntryCached({
      occurrence: OCCURRENCE,
      owner: 'user-a',
      term: 'expect',
    })
    await lookupVocabEntryCached({
      occurrence: OCCURRENCE,
      owner: 'user-b',
      term: 'expect',
    })

    expect(mocks.lookupVocabEntryApi).toHaveBeenCalledTimes(2)
  })

  test('a mark updates every cached lookup of that entry for that learner', async () => {
    await lookupVocabEntryCached({
      occurrence: OCCURRENCE,
      owner: 'user-a',
      term: 'expect',
    })
    const item = { id: 'item', status: 'alreadyKnow' } as NonNullable<
      VocabEntryWithUserStateRecord['userItem']
    >

    updateCachedVocabUserItem('user-a', 'entry-1', item)

    expect(readCachedVocabLookup('user-a', 'expect')?.userItem).toBe(item)
  })

  test('a failed lookup is not cached', async () => {
    mocks.lookupVocabEntryApi.mockRejectedValueOnce(new Error('Not found.'))

    await expect(
      lookupVocabEntryCached({
        occurrence: OCCURRENCE,
        owner: 'user-a',
        term: 'zzz',
      })
    ).rejects.toThrow('Not found.')
    expect(readCachedVocabLookup('user-a', 'zzz')).toBeNull()
  })

  test('an entry expires after a short lifetime', () => {
    writeCachedVocabLookup('user-a', 'expect', RECORD, 0)

    expect(readCachedVocabLookup('user-a', 'expect', 1000)).toBe(RECORD)
    expect(
      readCachedVocabLookup('user-a', 'expect', VOCAB_LOOKUP_CACHE_TTL_MS)
    ).toBeNull()
  })

  test('invalidating an entry drops it for every learner and term', () => {
    writeCachedVocabLookup('user-a', 'expect', RECORD)
    writeCachedVocabLookup('user-a', 'expects', RECORD)
    writeCachedVocabLookup('user-b', 'expect', RECORD)

    invalidateCachedVocabEntry('entry-1')

    expect(readCachedVocabLookup('user-a', 'expect')).toBeNull()
    expect(readCachedVocabLookup('user-a', 'expects')).toBeNull()
    expect(readCachedVocabLookup('user-b', 'expect')).toBeNull()
  })

  test('a mark from any screen drops the cached lookup once it settles', async () => {
    writeCachedVocabLookup('user-a', 'expect', RECORD)
    const outbox = {
      enqueue: vi.fn().mockResolvedValue({
        data: { item: { id: 'item', status: 'alreadyKnow' } },
        ok: true,
      }),
    } as unknown as Outbox

    await enqueueVocabItemStatus(outbox, {
      source: 'manual',
      status: 'alreadyKnow',
      vocabEntryId: 'entry-1',
    })

    expect(readCachedVocabLookup('user-a', 'expect')).toBeNull()
  })

  test('a settled recall answer drops the cached lookup', async () => {
    writeCachedVocabLookup('user-a', 'expect', RECORD)
    const outbox = {
      enqueue: vi.fn().mockResolvedValue({ data: {}, ok: true }),
    } as unknown as Outbox

    await enqueueVocabRecallAnswer(outbox, {
      action: 'remember',
      selectedOptionId: null,
      task: {
        entry: { id: 'entry-1' },
        taskId: 'task-1',
        token: 'token',
      } as unknown as VocabRecallTaskRecord,
    })

    expect(readCachedVocabLookup('user-a', 'expect')).toBeNull()
  })
})

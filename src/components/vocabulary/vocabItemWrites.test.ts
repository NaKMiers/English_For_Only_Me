import { describe, expect, test, vi } from 'vitest'

import { createOutbox } from '@/lib/sync/outbox'
import type { UserVocabItemApiRecord } from '@/modules/vocabulary/types'

import {
  buildOptimisticUserItem,
  createEntryWriteTracker,
  enqueueVocabItemStatus,
  toVocabItemWriteOutcome,
} from './vocabItemWrites'

const NOW = new Date('2026-10-24T10:00:00.000Z')

function makeEntry(userItem: UserVocabItemApiRecord | null = null) {
  return {
    entry: { id: 'entry-1', term: 'expect' },
    userItem,
  } as Parameters<typeof buildOptimisticUserItem>[0]['entry']
}

describe('entry write tracker', () => {
  test('a rejected write rolls back to the state before the first press', () => {
    const tracker = createEntryWriteTracker<string>()
    const ticket = tracker.begin('a', 'before')

    expect(tracker.settle('a', ticket, { kind: 'failed' })).toEqual({
      kind: 'rollback',
      state: 'before',
    })
    expect(tracker.hasPending('a')).toBe(false)
  })

  test('only the newest write decides the outcome', () => {
    const tracker = createEntryWriteTracker<string>()
    const first = tracker.begin('a', 'before')
    const second = tracker.begin('a', 'after-first-press')

    // The older write landed: it becomes the rollback point, UI untouched.
    expect(
      tracker.settle('a', first, { kind: 'saved', state: 'server-1' })
    ).toEqual({ kind: 'ignore' })
    expect(tracker.settle('a', second, { kind: 'failed' })).toEqual({
      kind: 'rollback',
      state: 'server-1',
    })
  })

  test('a superseded write never touches the UI', () => {
    const tracker = createEntryWriteTracker<string>()
    const first = tracker.begin('a', 'before')
    const second = tracker.begin('a', 'x')

    expect(tracker.settle('a', first, { kind: 'superseded' })).toEqual({
      kind: 'ignore',
    })
    expect(
      tracker.settle('a', second, { kind: 'saved', state: 'server' })
    ).toEqual({ kind: 'apply', state: 'server' })
  })
})

describe('vocab item writes', () => {
  test('a repeat press on a queued word replaces it, last decision wins', async () => {
    const bodies: unknown[] = []
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) => {
        bodies.push(JSON.parse(String(init?.body)))

        return new Response(JSON.stringify({ item: { id: 'item' } }), {
          status: 200,
        })
      }
    ) as unknown as typeof fetch
    const outbox = createOutbox({ fetchImpl, owner: 'test' })
    const blocker = enqueueVocabItemStatus(outbox, {
      source: 'explore',
      status: 'shouldLearn',
      vocabEntryId: 'other',
    })
    const first = enqueueVocabItemStatus(outbox, {
      source: 'explore',
      status: 'shouldLearn',
      vocabEntryId: 'entry-1',
    })
    const second = enqueueVocabItemStatus(outbox, {
      source: 'explore',
      status: 'alreadyKnow',
      vocabEntryId: 'entry-1',
    })

    await Promise.all([blocker, first, second])

    expect(await first).toEqual({ kind: 'superseded' })
    expect(await second).toMatchObject({ kind: 'saved' })
    expect(bodies).toEqual([
      { source: 'explore', status: 'shouldLearn', vocabEntryId: 'other' },
      { source: 'explore', status: 'alreadyKnow', vocabEntryId: 'entry-1' },
    ])
  })

  test('a 4xx becomes a failed outcome with the API message', () => {
    expect(
      toVocabItemWriteOutcome({ error: 'Nope.', ok: false, status: 409 })
    ).toEqual({ error: 'Nope.', kind: 'failed', status: 409 })
  })

  test('"Should Learn" on a word in progress keeps its progress', () => {
    const learning = {
      id: 'item-1',
      recallStage: 4,
      status: 'learning',
    } as UserVocabItemApiRecord

    expect(
      buildOptimisticUserItem({
        entry: makeEntry(learning),
        source: 'manual',
        status: 'shouldLearn',
      })
    ).toBe(learning)
  })

  test('marks a new word as learning at stage 1, due now', () => {
    expect(
      buildOptimisticUserItem({
        entry: makeEntry(),
        now: NOW,
        source: 'explore',
        status: 'shouldLearn',
      })
    ).toMatchObject({
      dueAt: NOW,
      id: 'optimistic-entry-1',
      recallStage: 1,
      status: 'learning',
    })
  })
})

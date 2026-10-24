import { describe, expect, test, vi } from 'vitest'

import type { Outbox } from '@/lib/sync/outbox'
import type {
  UserVocabItemApiRecord,
  VocabRecallTaskRecord,
} from '@/modules/vocabulary/types'

import {
  createVocabRecallCardResult,
  enqueueVocabRecallAnswer,
  getVocabRecallIdempotencyKey,
  gradeVocabRecallTaskLocally,
  isVocabRecallTaskExpired,
  mergeVocabRecallPage,
  reconcileVocabRecallCardResult,
  shouldPrefetchVocabRecallPage,
} from './vocabRecallSession'

const NOW = new Date('2026-10-24T10:00:00.000Z')

function makeToken(payload: Record<string, unknown>) {
  return `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`
}

function makeItem(
  overrides: Partial<UserVocabItemApiRecord> = {}
): UserVocabItemApiRecord {
  return {
    correctCount: 2,
    createdAt: NOW,
    dueAt: NOW,
    firstSeenAt: NOW,
    id: 'item-1',
    knownAt: null,
    knownReason: null,
    lastReviewedAt: null,
    masteredAt: null,
    masteredReason: null,
    notes: null,
    recallStage: 3,
    reviewCount: 2,
    source: 'explore',
    status: 'learning',
    updatedAt: NOW,
    userId: 'user',
    vocabEntryId: 'entry-1',
    wrongCount: 0,
    ...overrides,
  }
}

function makeTask({
  correctOptionId = 'word:entry-1',
  expiresAt = NOW.getTime() + 30 * 60_000,
  item = makeItem(),
  taskId = 'task-1',
  type = 'definitionChooseWord',
}: {
  correctOptionId?: string | null
  expiresAt?: number
  item?: UserVocabItemApiRecord
  taskId?: string
  type?: VocabRecallTaskRecord['type']
} = {}) {
  return {
    entry: { id: item.vocabEntryId, term: 'expect' },
    exampleSentence: null,
    item,
    options: [],
    taskId,
    token: makeToken({
      correctAnswer: correctOptionId ?? 'remember',
      correctOptionId,
      entryId: item.vocabEntryId,
      expiresAt,
      itemId: item.id,
      recallStage: item.recallStage,
      taskId,
      type,
    }),
    type,
  } as unknown as VocabRecallTaskRecord
}

describe('local recall grading', () => {
  test('a correct pick advances the predicted stage', () => {
    const result = gradeVocabRecallTaskLocally({
      action: null,
      now: NOW,
      selectedOptionId: 'word:entry-1',
      task: makeTask(),
    })

    expect(result?.isCorrect).toBe(true)
    expect(result?.item).toMatchObject({
      correctCount: 3,
      recallStage: 4,
      reviewCount: 3,
      status: 'learning',
    })
  })

  test('a wrong pick resets the predicted stage to 1, due now', () => {
    const result = gradeVocabRecallTaskLocally({
      action: null,
      now: NOW,
      selectedOptionId: 'word:other',
      task: makeTask(),
    })

    expect(result?.isCorrect).toBe(false)
    expect(result?.item).toMatchObject({
      dueAt: NOW,
      recallStage: 1,
      wrongCount: 1,
    })
  })

  test('remembering at stage 7 predicts mastery', () => {
    const result = gradeVocabRecallTaskLocally({
      action: 'remember',
      now: NOW,
      selectedOptionId: null,
      task: makeTask({
        correctOptionId: null,
        item: makeItem({ recallStage: 7 }),
        type: 'exampleRemember',
      }),
    })

    expect(result?.item).toMatchObject({ dueAt: null, status: 'mastered' })
  })

  test('an unreadable token is "not saved" instead of a guessed verdict', () => {
    const task = { ...makeTask(), token: 'garbage' }

    expect(
      createVocabRecallCardResult({
        action: null,
        selectedOptionId: 'word:entry-1',
        task,
      })
    ).toMatchObject({ saveState: 'notSaved' })
  })
})

describe('recall answer delivery', () => {
  test('the idempotency key is stable per task', () => {
    expect(getVocabRecallIdempotencyKey('task-1')).toBe(
      getVocabRecallIdempotencyKey('task-1')
    )
    expect(getVocabRecallIdempotencyKey('task-1')).not.toBe(
      getVocabRecallIdempotencyKey('task-2')
    )
  })

  test('the outbox item id and the body carry the same key', () => {
    const enqueue = vi.fn().mockResolvedValue({ data: {}, ok: true })
    const outbox = { enqueue } as unknown as Outbox
    const task = makeTask()

    void enqueueVocabRecallAnswer(outbox, {
      action: null,
      selectedOptionId: 'word:entry-1',
      task,
    })

    expect(enqueue).toHaveBeenCalledWith({
      body: {
        action: null,
        idempotencyKey: 'vocab-recall:task-1',
        selectedOptionId: 'word:entry-1',
        token: task.token,
      },
      id: 'vocab-recall:task-1',
      lane: 'vocab:recall',
      url: '/api/vocab/recall/answer',
    })
  })

  test('the server verdict and item replace the local prediction', () => {
    const local = createVocabRecallCardResult({
      action: null,
      now: NOW,
      selectedOptionId: 'word:other',
      task: makeTask(),
    })
    const serverItem = makeItem({ recallStage: 4 })

    expect(local.isCorrect).toBe(false)
    expect(
      reconcileVocabRecallCardResult(local, {
        data: { attemptId: 'a', isCorrect: true, item: serverItem },
        ok: true,
        status: 200,
      })
    ).toMatchObject({ isCorrect: true, item: serverItem, saveState: 'saved' })
  })

  test('a rejected (expired) answer is "not saved"', () => {
    const local = createVocabRecallCardResult({
      action: null,
      selectedOptionId: 'word:entry-1',
      task: makeTask(),
    })

    expect(
      reconcileVocabRecallCardResult(local, {
        error: 'This recall card is stale. Refresh recall.',
        ok: false,
        status: 409,
      })
    ).toMatchObject({
      error: expect.stringContaining('expired'),
      saveState: 'notSaved',
    })
  })
})

describe('due queue paging', () => {
  test('prefetches once five or fewer cards remain', () => {
    const base = { isFetching: false, nextCursor: 'cursor' }

    expect(shouldPrefetchVocabRecallPage({ ...base, remaining: 6 })).toBe(false)
    expect(shouldPrefetchVocabRecallPage({ ...base, remaining: 5 })).toBe(true)
    expect(
      shouldPrefetchVocabRecallPage({ ...base, isFetching: true, remaining: 1 })
    ).toBe(false)
    expect(
      shouldPrefetchVocabRecallPage({
        isFetching: false,
        nextCursor: null,
        remaining: 1,
      })
    ).toBe(false)
  })

  test('merging skips held cards and items answered this session', () => {
    const held = makeTask({ item: makeItem({ id: 'held' }), taskId: 'a' })
    const answered = makeTask({
      item: makeItem({ id: 'answered' }),
      taskId: 'b',
    })
    const fresh = makeTask({ item: makeItem({ id: 'fresh' }), taskId: 'c' })
    const duplicate = makeTask({ item: makeItem({ id: 'held' }), taskId: 'd' })

    expect(
      mergeVocabRecallPage({
        answeredItemIds: new Set(['answered']),
        current: [held],
        incoming: [duplicate, answered, fresh],
      }).map(task => task.taskId)
    ).toEqual(['a', 'c'])
  })

  test('a card near its token lifetime counts as expired', () => {
    expect(
      isVocabRecallTaskExpired(
        makeTask({ expiresAt: NOW.getTime() + 30_000 }),
        NOW.getTime()
      )
    ).toBe(true)
    expect(
      isVocabRecallTaskExpired(
        makeTask({ expiresAt: NOW.getTime() + 10 * 60_000 }),
        NOW.getTime()
      )
    ).toBe(false)
  })
})

import { Types } from 'mongoose'
import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  attemptCreate,
  attemptDeleteOne,
  attemptFindOne,
  itemFindOne,
  itemFindOneAndUpdate,
} = vi.hoisted(() => ({
  attemptCreate: vi.fn(),
  attemptDeleteOne: vi.fn(),
  attemptFindOne: vi.fn(),
  itemFindOne: vi.fn(),
  itemFindOneAndUpdate: vi.fn(),
}))

vi.mock('@/models/vocabulary/VocabRecallAttemptModel', () => ({
  VocabRecallAttemptModel: {
    create: (...args: unknown[]) => attemptCreate(...args),
    deleteOne: (...args: unknown[]) => attemptDeleteOne(...args),
    findOne: (...args: unknown[]) => ({ lean: () => attemptFindOne(...args) }),
  },
}))

vi.mock('@/models/vocabulary/UserVocabItemModel', () => ({
  UserVocabItemModel: {
    findOne: (...args: unknown[]) => ({ lean: () => itemFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => ({
      lean: () => itemFindOneAndUpdate(...args),
    }),
  },
}))

import { submitVocabRecallAnswerForUser } from './recallAnswerService'
import { createVocabRecallTaskToken } from './recallTaskToken'

const NOW = new Date('2026-10-01T00:00:00.000Z')
const itemId = '507f1f77bcf86cd799439011'
const entryId = '507f1f77bcf86cd799439012'
const attemptId = new Types.ObjectId('507f1f77bcf86cd799439013')

function makeItem(recallStage: number, reviewCount = 4) {
  return {
    _id: new Types.ObjectId(itemId),
    createdAt: NOW,
    dueAt: NOW,
    recallStage,
    reviewCount,
    status: 'learning' as const,
    updatedAt: NOW,
    userId: 'user-1',
    vocabEntryId: new Types.ObjectId(entryId),
  }
}

function submit() {
  return submitVocabRecallAnswerForUser({
    idempotencyKey: 'vocab-recall:task-1',
    now: NOW,
    selectedOptionId: `word:${entryId}`,
    token: createVocabRecallTaskToken(
      {
        correctAnswer: 'word',
        correctOptionId: `word:${entryId}`,
        entryId,
        itemId,
        recallStage: 2,
        taskId: 'task-1',
        type: 'definitionChooseWord',
      },
      'user-1',
      NOW
    ),
    userId: 'user-1',
  })
}

const savedAttempt = { _id: attemptId, isCorrect: true, itemId }

afterEach(() => vi.resetAllMocks())

describe('submitVocabRecallAnswerForUser', () => {
  it('answers a replay with the saved attempt', async () => {
    attemptFindOne.mockResolvedValue(savedAttempt)
    itemFindOne.mockResolvedValue(makeItem(3))

    const result = await submit()

    expect(result).toMatchObject({
      attemptId: String(attemptId),
      isCorrect: true,
      item: { recallStage: 3 },
    })
    expect(itemFindOneAndUpdate).not.toHaveBeenCalled()
  })

  it('reads a duplicate that raced the first copy as saved, not stale', async () => {
    // First lookup: no attempt yet. The first copy has already moved the item
    // to stage 3, so the due read misses; by the re-check its attempt exists.
    attemptFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedAttempt)
    itemFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeItem(3))

    const result = await submit()

    expect(result).toMatchObject({
      attemptId: String(attemptId),
      isCorrect: true,
      item: { recallStage: 3 },
    })
    expect(itemFindOneAndUpdate).not.toHaveBeenCalled()
    expect(attemptFindOne).toHaveBeenLastCalledWith({
      idempotencyKey: 'vocab-recall:task-1',
      userId: 'user-1',
    })
  })

  it('still reports a card that is genuinely no longer due as not saved', async () => {
    attemptFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue(null)

    await expect(submit()).resolves.toBeNull()
    expect(attemptFindOne).toHaveBeenCalledTimes(2)
  })

  it('saves a first answer and records its attempt', async () => {
    attemptFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue(makeItem(2))
    itemFindOneAndUpdate.mockResolvedValue(makeItem(3))
    attemptCreate.mockResolvedValue({ _id: attemptId })

    const result = await submit()

    expect(result).toMatchObject({
      attemptId: String(attemptId),
      isCorrect: true,
      item: { recallStage: 3 },
    })
    expect(attemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: 'vocab-recall:task-1',
        recallStageBefore: 2,
      })
    )
  })

  it('answers with the winning attempt on a duplicate key', async () => {
    attemptFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(savedAttempt)
    itemFindOne
      .mockResolvedValueOnce(makeItem(2))
      .mockResolvedValueOnce(makeItem(3))
    attemptCreate.mockRejectedValue(
      Object.assign(new Error('dup'), { code: 11000 })
    )

    await expect(submit()).resolves.toMatchObject({
      attemptId: String(attemptId),
      item: { recallStage: 3 },
    })
    // The key is claimed before the item moves, so the loser never writes.
    expect(itemFindOneAndUpdate).not.toHaveBeenCalled()
  })

  it('claims the key before moving the item, guarded by the read state', async () => {
    attemptFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue(makeItem(2))
    itemFindOneAndUpdate.mockResolvedValue(makeItem(3))
    attemptCreate.mockResolvedValue({ _id: attemptId })

    await submit()

    expect(attemptCreate.mock.invocationCallOrder[0]).toBeLessThan(
      itemFindOneAndUpdate.mock.invocationCallOrder[0]
    )
    expect(itemFindOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: itemId,
        dueAt: { $lte: NOW },
        recallStage: 2,
        reviewCount: 4,
        status: 'learning',
        userId: 'user-1',
        vocabEntryId: entryId,
      },
      expect.anything(),
      expect.anything()
    )
  })

  it('matches a missing review counter on older items', async () => {
    attemptFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue({ ...makeItem(2), reviewCount: undefined })
    itemFindOneAndUpdate.mockResolvedValue(makeItem(3))
    attemptCreate.mockResolvedValue({ _id: attemptId })

    await submit()

    expect(itemFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reviewCount: { $in: [0, null] } }),
      expect.anything(),
      expect.anything()
    )
  })

  it('does not apply a second task when another answer moved the item first', async () => {
    attemptFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue(makeItem(2))
    // The other task's write landed between this read and this write.
    itemFindOneAndUpdate.mockResolvedValue(null)
    attemptCreate.mockResolvedValue({ _id: attemptId })

    await expect(submit()).resolves.toBeNull()
    expect(attemptDeleteOne).toHaveBeenCalledWith({
      _id: String(attemptId),
      userId: 'user-1',
    })
  })
})

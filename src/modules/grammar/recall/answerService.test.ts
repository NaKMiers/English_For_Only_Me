import { afterEach, describe, expect, it, vi } from 'vitest'

const { attemptCreate, attemptFindOne, itemFindOne, itemUpdate, pointFindOne } =
  vi.hoisted(() => ({
    attemptCreate: vi.fn(),
    attemptFindOne: vi.fn(),
    itemFindOne: vi.fn(),
    itemUpdate: vi.fn(),
    pointFindOne: vi.fn(),
  }))

vi.mock('@/models/grammar/GrammarDrillAttemptModel', () => ({
  GrammarDrillAttemptModel: {
    create: (...args: unknown[]) => attemptCreate(...args),
    findOne: (...args: unknown[]) => ({ lean: () => attemptFindOne(...args) }),
  },
}))

vi.mock('@/models/grammar/GrammarPointModel', () => ({
  GrammarPointModel: {
    findOne: (...args: unknown[]) => ({
      select: () => ({ lean: () => pointFindOne(...args) }),
    }),
  },
}))

vi.mock('@/models/grammar/UserGrammarItemModel', () => ({
  UserGrammarItemModel: {
    findOne: (...args: unknown[]) => ({ lean: () => itemFindOne(...args) }),
    findOneAndUpdate: (...args: unknown[]) => ({
      lean: () => itemUpdate(...args),
    }),
  },
}))

import { submitGrammarAnswer } from './answerService'

const AT = new Date('2026-10-01T00:00:00.000Z')

const DRILL = {
  acceptedAnswers: ['went'],
  explanation: 'Past simple.',
  id: 'drill-1',
  kind: 'fill',
  target: 'went',
}

function makeItem(recallStage: number, lastReviewedAt: Date | null) {
  return {
    _id: 'item-1',
    correctCount: 1,
    dueAt: AT,
    lastReviewedAt,
    masteredAt: null,
    pointSlug: 'past-simple',
    recallStage,
    reviewCount: 2,
    status: 'learning',
    wrongCount: 1,
  }
}

const priorAttempt = {
  _id: 'attempt-1',
  at: AT,
  drillId: 'drill-1',
  matchedAnswer: 'went',
  origin: 'recall',
  pointSlug: 'past-simple',
  stageAfter: 3,
  stageBefore: 2,
  verdict: 'correct',
}

function submit() {
  return submitGrammarAnswer({
    actorId: 'actor-1',
    answer: 'went',
    drillId: 'drill-1',
    idempotencyKey: 'grammar:key-1',
    now: new Date(AT.getTime() + 5 * 60_000),
    pointSlug: 'past-simple',
  })
}

afterEach(() => vi.resetAllMocks())

describe('submitGrammarAnswer replays', () => {
  it('reads a replay as saved after its drill was edited away', async () => {
    attemptFindOne.mockResolvedValue(priorAttempt)
    // The drill is gone from the point now.
    pointFindOne.mockResolvedValue({
      drills: [],
      l1Risk: 'medium',
      slug: 'past-simple',
    })
    itemFindOne.mockResolvedValue(makeItem(3, AT))

    const result = await submit()

    expect(attemptFindOne).toHaveBeenCalledWith({
      actorId: 'actor-1',
      idempotencyKey: 'grammar:key-1',
    })
    expect(result).toMatchObject({
      explanation: '',
      isCorrect: true,
      item: { recallStage: 3 },
      verdict: 'correct',
    })
    expect(itemUpdate).not.toHaveBeenCalled()
    expect(attemptCreate).not.toHaveBeenCalled()
  })

  it('reads a replay as saved after its point was deleted', async () => {
    attemptFindOne.mockResolvedValue(priorAttempt)
    pointFindOne.mockResolvedValue(null)
    itemFindOne.mockResolvedValue(makeItem(3, AT))

    await expect(submit()).resolves.toMatchObject({ item: { recallStage: 3 } })
  })

  it('finishes the ladder move a failed first request never made', async () => {
    attemptFindOne.mockResolvedValue(priorAttempt)
    pointFindOne.mockResolvedValue({
      drills: [DRILL],
      l1Risk: 'medium',
      slug: 'past-simple',
    })
    // The attempt landed, then the request died before the ladder $set.
    itemFindOne.mockResolvedValue(
      makeItem(2, new Date('2026-09-20T00:00:00.000Z'))
    )
    itemUpdate.mockResolvedValue(makeItem(3, AT))

    const result = await submit()

    expect(itemUpdate).toHaveBeenCalledTimes(1)
    const [filter, update] = itemUpdate.mock.calls[0] as [
      Record<string, unknown>,
      { $set: Record<string, unknown> },
    ]

    expect(filter).toMatchObject({
      _id: 'item-1',
      actorId: 'actor-1',
      pointSlug: 'past-simple',
      recallStage: 2,
    })
    expect(update.$set).toMatchObject({
      lastReviewedAt: AT,
      recallStage: 3,
      reviewCount: 3,
    })
    expect(result).toMatchObject({
      explanation: 'Past simple.',
      item: { recallStage: 3 },
    })
    expect(attemptCreate).not.toHaveBeenCalled()
  })

  it('re-reads the item when a concurrent replay repaired it first', async () => {
    attemptFindOne.mockResolvedValue(priorAttempt)
    pointFindOne.mockResolvedValue({
      drills: [DRILL],
      l1Risk: 'medium',
      slug: 'past-simple',
    })
    itemFindOne
      .mockResolvedValueOnce(makeItem(2, null))
      .mockResolvedValueOnce(makeItem(3, AT))
    // The compare-and-set filter no longer matches.
    itemUpdate.mockResolvedValue(null)

    await expect(submit()).resolves.toMatchObject({ item: { recallStage: 3 } })
    expect(itemUpdate).toHaveBeenCalledTimes(1)
  })

  it('does not move a ladder that already moved', async () => {
    attemptFindOne.mockResolvedValue(priorAttempt)
    pointFindOne.mockResolvedValue({
      drills: [DRILL],
      l1Risk: 'medium',
      slug: 'past-simple',
    })
    itemFindOne.mockResolvedValue(makeItem(3, AT))

    await submit()

    expect(itemUpdate).not.toHaveBeenCalled()
  })
})

describe('submitGrammarAnswer fresh answers', () => {
  const POINT = { drills: [DRILL], l1Risk: 'medium', slug: 'past-simple' }

  it('grades an answer for a point that is no longer due without moving it', async () => {
    attemptFindOne.mockResolvedValue(null)
    pointFindOne.mockResolvedValue(POINT)
    // A stale queue: the point was already reviewed and is due tomorrow.
    itemFindOne.mockResolvedValue({
      ...makeItem(3, AT),
      dueAt: new Date(AT.getTime() + 24 * 60 * 60_000),
    })

    const result = await submit()

    expect(result).toMatchObject({ isCorrect: true, item: { recallStage: 3 } })
    expect(attemptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: 'early',
        stageAfter: 3,
        stageBefore: 3,
      })
    )
    expect(itemUpdate).not.toHaveBeenCalled()
  })

  it('moves the ladder once when two tasks for one point land together', async () => {
    attemptFindOne.mockResolvedValue(null)
    pointFindOne.mockResolvedValue(POINT)
    itemFindOne
      .mockResolvedValueOnce(makeItem(2, null))
      // The other task won the compare-and-set and moved it to stage 3.
      .mockResolvedValueOnce(makeItem(3, AT))
    itemUpdate.mockResolvedValue(null)

    const result = await submit()

    expect(itemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ recallStage: 2 }),
      expect.anything(),
      expect.anything()
    )
    expect(result).toMatchObject({ item: { recallStage: 3 } })
  })
})

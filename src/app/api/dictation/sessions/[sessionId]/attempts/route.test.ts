import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  attemptFindOne: vi.fn(),
  attemptSave: vi.fn(),
  loadSegmentProgressRows: vi.fn(),
  recomputeReviewItemsForSegment: vi.fn(),
  requirePracticeActor: vi.fn(),
  segmentFindOne: vi.fn(),
  sessionFindOne: vi.fn(),
}))

vi.mock('@/lib/db/connectDatabase', () => ({
  connectDatabase: vi.fn(async () => undefined),
}))

vi.mock('@/modules/dictation/services/getCurrentUser', () => ({
  requirePracticeActor: mocks.requirePracticeActor,
}))

vi.mock('@/modules/dictation/services/videoRouteDecisions', async () => ({
  ...(await vi.importActual<object>(
    '@/modules/dictation/services/videoRouteDecisions'
  )),
  getMissingMongoResponse: () => null,
}))

vi.mock('@/models/dictation/DictationAttemptModel', () => {
  class DictationAttemptModel {
    static findOne = mocks.attemptFindOne

    constructor(fields: Record<string, unknown>) {
      Object.assign(this, fields)
    }

    save() {
      return mocks.attemptSave()
    }
  }

  return { DictationAttemptModel }
})

vi.mock('@/models/dictation/DictationSegmentModel', () => ({
  DictationSegmentModel: { findOne: mocks.segmentFindOne },
}))

vi.mock('@/models/dictation/DictationSessionModel', () => ({
  DictationSessionModel: { findOne: mocks.sessionFindOne },
}))

vi.mock('@/modules/dictation/practice/segmentProgressService', () => ({
  loadSegmentProgressRows: mocks.loadSegmentProgressRows,
}))

vi.mock('@/modules/dictation/review/reviewItemService', () => ({
  recomputeReviewItemsForSegment: mocks.recomputeReviewItemsForSegment,
}))

import { POST } from './route'

const sessionId = '507f1f77bcf86cd799439011'
const segmentId = '507f1f77bcf86cd799439013'
const videoId = '507f1f77bcf86cd799439014'
const transcriptId = '507f1f77bcf86cd799439015'
const idempotencyKey = 'attempt-key-123'
const now = new Date('2026-10-24T10:00:00.000Z')

const storedAttempt = {
  _id: '507f1f77bcf86cd799439020',
  action: 'check' as const,
  createdAt: now,
  expectedTextSnapshot: 'Hello there',
  idempotencyKey,
  isPassed: true,
  segmentId,
  sessionId,
  transcriptId,
  typedAnswer: 'hello there',
  updatedAt: now,
  userId: 'user-1',
  videoId,
}

const storedSession = {
  _id: sessionId,
  createdAt: now,
  currentSegmentId: segmentId,
  lastActiveAt: now,
  startedAt: now,
  status: 'active' as const,
  transcriptId,
  updatedAt: now,
  userId: 'user-1',
  videoId,
}

function lean<T>(value: T) {
  return { lean: async () => value }
}

/** The idempotency lookup: findOne(...).sort(...).lean(). */
function sortedLean<T>(value: T) {
  return { sort: () => lean(value) }
}

function postAttempt(targetSessionId = sessionId) {
  return POST(
    new Request(
      `http://localhost/api/dictation/sessions/${targetSessionId}/attempts`,
      {
        body: JSON.stringify({
          action: 'check',
          idempotencyKey,
          segmentId,
          typedAnswer: 'hello there',
        }),
        method: 'POST',
      }
    ),
    { params: Promise.resolve({ sessionId: targetSessionId }) }
  )
}

function mockNewAttemptFlow({ sessionSave }: { sessionSave: () => unknown }) {
  mocks.attemptFindOne.mockReturnValueOnce(sortedLean(null))
  mocks.sessionFindOne.mockResolvedValueOnce({
    ...storedSession,
    save: sessionSave,
    toObject: () => storedSession,
  })
  mocks.segmentFindOne
    .mockResolvedValueOnce({ _id: segmentId, order: 1, text: 'Hello there' })
    .mockReturnValueOnce({
      sort: () => ({ select: () => lean(null) }),
    })
}

beforeEach(() => {
  mocks.requirePracticeActor.mockResolvedValue({ id: 'user-1' })
  mocks.loadSegmentProgressRows.mockResolvedValue([])
  mocks.recomputeReviewItemsForSegment.mockResolvedValue(undefined)
})

afterEach(() => vi.clearAllMocks())

describe('POST /api/dictation/sessions/[sessionId]/attempts', () => {
  it('answers a replay and reruns the review item recompute', async () => {
    mocks.attemptFindOne.mockReturnValueOnce(sortedLean(storedAttempt))
    mocks.sessionFindOne.mockReturnValueOnce(lean(storedSession))

    const response = await postAttempt()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      attempt: { id: storedAttempt._id, idempotencyKey },
      mode: 'idempotent',
      nextSegmentId: segmentId,
    })
    // Keys are per user, not per session.
    expect(mocks.attemptFindOne).toHaveBeenCalledWith({
      idempotencyKey,
      userId: 'user-1',
    })
    expect(mocks.recomputeReviewItemsForSegment).toHaveBeenCalledWith({
      segmentId,
      userId: 'user-1',
      videoId,
    })
    expect(mocks.segmentFindOne).not.toHaveBeenCalled()
    expect(mocks.attemptSave).not.toHaveBeenCalled()
  })

  it('creates the review item on the retry after a first delivery failed late', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    // First delivery: the attempt is saved, then the session save throws.
    mockNewAttemptFlow({
      sessionSave: vi.fn(async () => {
        throw new Error('session write failed')
      }),
    })
    mocks.attemptSave.mockResolvedValueOnce(undefined)

    const first = await postAttempt()

    expect(first.status).toBe(500)
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to save dictation attempt',
      expect.objectContaining({ message: 'session write failed' })
    )
    expect(mocks.attemptSave).toHaveBeenCalledTimes(1)

    // The outbox retry finds the saved attempt and replays it.
    mocks.recomputeReviewItemsForSegment.mockClear()
    mocks.attemptFindOne.mockReturnValueOnce(sortedLean(storedAttempt))
    mocks.sessionFindOne.mockReturnValueOnce(lean(storedSession))

    const retry = await postAttempt()

    expect(retry.status).toBe(200)
    await expect(retry.json()).resolves.toMatchObject({ mode: 'idempotent' })
    expect(mocks.recomputeReviewItemsForSegment).toHaveBeenCalledTimes(1)
    expect(mocks.recomputeReviewItemsForSegment).toHaveBeenCalledWith({
      segmentId,
      userId: 'user-1',
      videoId,
    })
    expect(mocks.attemptSave).toHaveBeenCalledTimes(1)
  })

  it('replays a key first recorded in another session instead of saving it again', async () => {
    const newSessionId = '507f1f77bcf86cd799439099'
    const newSession = {
      ...storedSession,
      _id: newSessionId,
      currentSegmentId: null,
    }

    // storedAttempt belongs to the old session (sessionId).
    mocks.attemptFindOne.mockReturnValueOnce(sortedLean(storedAttempt))
    mocks.sessionFindOne.mockReturnValueOnce(lean(newSession))

    const response = await postAttempt(newSessionId)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      attempt: { id: storedAttempt._id, sessionId },
      mode: 'idempotent',
      session: { id: newSessionId },
    })
    expect(mocks.attemptFindOne).toHaveBeenCalledWith({
      idempotencyKey,
      userId: 'user-1',
    })
    expect(mocks.sessionFindOne).toHaveBeenCalledWith({
      _id: newSessionId,
      userId: 'user-1',
    })
    expect(mocks.attemptSave).not.toHaveBeenCalled()
    expect(mocks.segmentFindOne).not.toHaveBeenCalled()
  })

  it('answers a concurrent duplicate save with the winning attempt', async () => {
    const consoleError = vi.spyOn(console, 'error')

    mocks.attemptFindOne
      .mockReturnValueOnce(sortedLean(null))
      .mockReturnValueOnce(sortedLean(storedAttempt))
    mocks.sessionFindOne
      .mockResolvedValueOnce({ ...storedSession, save: vi.fn() })
      .mockReturnValueOnce(lean(storedSession))
    mocks.segmentFindOne.mockResolvedValueOnce({
      _id: segmentId,
      order: 1,
      text: 'Hello there',
    })
    mocks.attemptSave.mockRejectedValueOnce(
      Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    )

    const response = await postAttempt()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({
      attempt: { id: storedAttempt._id },
      mode: 'idempotent',
    })
    // Only the replay recomputes; the losing save never reached its own.
    expect(mocks.recomputeReviewItemsForSegment).toHaveBeenCalledTimes(1)
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('still fails other save errors as a 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.attemptFindOne.mockReturnValueOnce(sortedLean(null))
    mocks.sessionFindOne.mockResolvedValueOnce({
      ...storedSession,
      save: vi.fn(),
    })
    mocks.segmentFindOne.mockResolvedValueOnce({
      _id: segmentId,
      order: 1,
      text: 'Hello there',
    })
    mocks.attemptSave.mockRejectedValueOnce(new Error('network'))

    const response = await postAttempt()

    expect(response.status).toBe(500)
  })

  it('passes an owner mismatch through as a 409', async () => {
    mocks.requirePracticeActor.mockRejectedValueOnce(
      Object.assign(new Error('Signed in as someone else.'), { status: 409 })
    )

    const response = await postAttempt()

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      message: 'Signed in as someone else.',
    })
  })
})

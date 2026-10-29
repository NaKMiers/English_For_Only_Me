import { Types } from 'mongoose'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IELTS_SAMPLE_TEST } from '../fixtures/sampleTest'

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  findOneAndUpdate: vi.fn(),
  updateOne: vi.fn(),
  create: vi.fn(),
  deleteOne: vi.fn(),
  ledgerInsert: vi.fn(),
}))

const chain = (value: unknown) => ({
  lean: async () => value,
  sort: () => chain(value),
})

vi.mock('@/models/ielts/IeltsAttemptModel', () => ({
  IeltsAttemptModel: {
    findOne: (...args: unknown[]) => chain(mocks.findOne(...args)),
    findOneAndUpdate: (...args: unknown[]) =>
      chain(mocks.findOneAndUpdate(...args)),
    updateOne: mocks.updateOne,
    create: mocks.create,
    deleteOne: mocks.deleteOne,
  },
}))

vi.mock('@/models/ielts/IeltsGradingLedgerModel', () => ({
  IeltsGradingLedgerModel: { insertMany: mocks.ledgerInsert },
}))

vi.mock('../tests/testReaders', () => ({
  readPublishedIeltsTest: async () => ({ ...IELTS_SAMPLE_TEST, id: TEST_ID }),
  readIeltsTestVersion: async () => ({ ...IELTS_SAMPLE_TEST, id: TEST_ID }),
}))

const TEST_ID = new Types.ObjectId().toHexString()
const ATTEMPT_ID = new Types.ObjectId()
const OWNER = 'user-1'
const NOW = new Date('2026-10-29T10:00:00Z')

import {
  deleteAttemptForOwner,
  readPracticeEvidence,
  saveAttemptAnswers,
  startOrResumeAttempt,
  submitAttempt,
} from './attemptService'

function attempt(overrides: Record<string, unknown> = {}) {
  return {
    _id: ATTEMPT_ID,
    ownerId: OWNER,
    status: 'in_progress',
    skill: 'reading',
    mode: 'mock',
    scope: { kind: 'skill', part: null },
    testSlug: IELTS_SAMPLE_TEST.slug,
    testVersion: 1,
    track: 'academic',
    items: [],
    deadlineAt: new Date(NOW.getTime() + 60_000),
    startedAt: NOW,
    answers: {},
    audioEvents: [],
    savedSeq: 3,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateOne.mockResolvedValue({ matchedCount: 1 })
})

describe('saveAttemptAnswers', () => {
  it('applies a newer snapshot inside the deadline filter', async () => {
    mocks.findOne.mockReturnValue(attempt())
    mocks.findOneAndUpdate.mockReturnValue({ savedSeq: 4 })

    const result = await saveAttemptAnswers({
      answers: { '1': 'iii' },
      attemptId: String(ATTEMPT_ID),
      now: NOW,
      ownerId: OWNER,
      seq: 4,
    })

    expect(result).toEqual({ ok: true, data: { applied: true, savedSeq: 4 } })

    const filter = mocks.findOneAndUpdate.mock.calls[0][0]

    expect(filter).toMatchObject({
      ownerId: OWNER,
      status: 'in_progress',
      savedSeq: { $lt: 4 },
    })
    expect(filter.$or).toHaveLength(2)
  })

  it('answers a stale seq with 200 applied:false, and time up with 409', async () => {
    mocks.findOne.mockReturnValue(attempt())
    mocks.findOneAndUpdate.mockReturnValue(null)

    expect(
      await saveAttemptAnswers({
        answers: {},
        attemptId: String(ATTEMPT_ID),
        now: NOW,
        ownerId: OWNER,
        seq: 2,
      })
    ).toEqual({ ok: true, data: { applied: false, savedSeq: 3 } })

    mocks.findOne.mockReturnValue(
      attempt({ deadlineAt: new Date(NOW.getTime() - 120_000) })
    )

    expect(
      await saveAttemptAnswers({
        answers: {},
        attemptId: String(ATTEMPT_ID),
        now: NOW,
        ownerId: OWNER,
        seq: 9,
      })
    ).toMatchObject({ ok: false, status: 409 })
  })

  it("never reads another owner's attempt", async () => {
    mocks.findOne.mockReturnValue(null)

    expect(
      await saveAttemptAnswers({
        answers: {},
        attemptId: String(ATTEMPT_ID),
        now: NOW,
        ownerId: 'someone-else',
        seq: 5,
      })
    ).toMatchObject({ ok: false, status: 404 })
    expect(mocks.findOne.mock.calls[0][0]).toMatchObject({
      ownerId: 'someone-else',
    })
  })
})

describe('submitAttempt', () => {
  it('flips status with the final snapshot and scores a full reading test', async () => {
    const answers = Object.fromEntries(
      IELTS_SAMPLE_TEST.sections
        .filter(section => section.skill === 'reading')
        .flatMap(section => section.groups)
        .flatMap((group): [string, string | string[]][] =>
          group.type === 'multiple-choice-multi'
            ? [[String(group.from), group.correctKeys]]
            : group.questions.map(question => [
                String(question.number),
                question.answers[0],
              ])
        )
    )
    const submitted = attempt({ status: 'submitted', answers, savedSeq: 4 })

    mocks.findOne.mockReturnValue(attempt())
    mocks.findOneAndUpdate.mockReturnValue(submitted)

    await submitAttempt({
      answers,
      attemptId: String(ATTEMPT_ID),
      now: NOW,
      ownerId: OWNER,
      seq: 4,
    })

    const scored = mocks.updateOne.mock.calls.find(
      call => call[1].$set?.status === 'scored'
    )

    expect(scored?.[1].$set.result).toMatchObject({
      raw: 40,
      total: 40,
      band: 9,
    })
    expect(scored?.[1].$set.answerKeySnapshot.single['1']).toBeDefined()
  })
})

describe('startOrResumeAttempt', () => {
  it('replays the same idempotency key without creating a second attempt', async () => {
    mocks.findOne.mockReturnValueOnce(attempt())

    const result = await startOrResumeAttempt({
      input: {
        testSlug: IELTS_SAMPLE_TEST.slug,
        skill: 'reading',
        mode: 'mock',
        scope: { kind: 'skill' },
        sessionId: null,
        idempotencyKey: 'key-12345678',
      },
      now: NOW,
      ownerId: OWNER,
    })

    expect(result).toMatchObject({ ok: true, data: { mode: 'idempotent' } })
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('refuses a listening mock without audio', async () => {
    mocks.findOne.mockReturnValue(null)

    expect(
      await startOrResumeAttempt({
        input: {
          testSlug: IELTS_SAMPLE_TEST.slug,
          skill: 'listening',
          mode: 'mock',
          scope: { kind: 'skill' },
          sessionId: null,
          idempotencyKey: 'key-12345679',
        },
        now: NOW,
        ownerId: OWNER,
      })
    ).toMatchObject({ ok: false, status: 409 })
  })
})

describe('readPracticeEvidence', () => {
  it('serves evidence in practice and refuses it in mock', async () => {
    mocks.findOne.mockReturnValue(attempt({ mode: 'practice' }))

    expect(
      await readPracticeEvidence({
        attemptId: String(ATTEMPT_ID),
        number: 1,
        ownerId: OWNER,
      })
    ).toMatchObject({ ok: true, data: { sectionKey: 'reading-1' } })

    mocks.findOne.mockReturnValue(attempt({ mode: 'mock' }))

    expect(
      await readPracticeEvidence({
        attemptId: String(ATTEMPT_ID),
        number: 1,
        ownerId: OWNER,
      })
    ).toMatchObject({ ok: false, status: 403 })
  })
})

describe('deleteAttemptForOwner', () => {
  it("deletes the owner's attempt and keeps only today's gradings for the cap", async () => {
    const today = new Date('2026-10-29T08:00:00Z')

    mocks.findOne.mockReturnValue({
      gradings: [{ at: new Date('2026-10-28T23:00:00Z') }, { at: today }],
    })
    mocks.deleteOne.mockResolvedValue({ deletedCount: 1 })

    const deleted = await deleteAttemptForOwner(OWNER, 'a1', NOW)

    expect(mocks.findOne).toHaveBeenCalledWith(
      { _id: 'a1', ownerId: OWNER },
      { gradings: 1 }
    )
    expect(mocks.ledgerInsert).toHaveBeenCalledWith([
      { ownerId: OWNER, at: today },
    ])
    expect(mocks.deleteOne).toHaveBeenCalledWith({ _id: 'a1', ownerId: OWNER })
    expect(deleted).toBe(true)
  })

  it("refuses an attempt that is missing or someone else's", async () => {
    mocks.findOne.mockReturnValue(null)

    expect(await deleteAttemptForOwner(OWNER, 'a1', NOW)).toBe(false)
    expect(mocks.deleteOne).not.toHaveBeenCalled()
  })
})

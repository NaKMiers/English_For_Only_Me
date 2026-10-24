import { createHmac } from 'crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  decodeVocabRecallTaskPayload,
  gradeVocabRecallAnswer,
} from '@/modules/vocabulary/recall/recallTaskPayload'
import {
  createVocabRecallTaskToken,
  verifyVocabRecallTaskToken,
} from '@/modules/vocabulary/recall/recallTaskToken'

const PAYLOAD = {
  correctAnswer: 'café au lait - "naïve" résumé',
  correctOptionId: 'option-2',
  entryId: 'entry-1',
  itemId: 'item-1',
  recallStage: 3,
  taskId: 'task-1',
  type: 'wordChooseDefinition' as const,
}
const USER_ID = 'guest_secret-cookie-value'

describe('decodeVocabRecallTaskPayload (browser side)', () => {
  it('reads exactly what the server signed, including non-ASCII text', () => {
    const now = new Date('2026-10-24T00:00:00Z')
    const token = createVocabRecallTaskToken(PAYLOAD, USER_ID, now)

    expect(decodeVocabRecallTaskPayload(token)).toEqual(
      verifyVocabRecallTaskToken({ now, token, userId: USER_ID })
    )
  })

  it('never exposes the user id in the readable payload', () => {
    const token = createVocabRecallTaskToken(PAYLOAD, USER_ID)
    const [encodedPayload] = token.split('.')

    expect(decodeVocabRecallTaskPayload(token)).not.toHaveProperty('userId')
    expect(Buffer.from(encodedPayload, 'base64url').toString()).not.toContain(
      USER_ID
    )
  })

  it('returns null for a malformed token', () => {
    expect(decodeVocabRecallTaskPayload('')).toBeNull()
    expect(decodeVocabRecallTaskPayload('%%%.sig')).toBeNull()
  })
})

describe('verifyVocabRecallTaskToken', () => {
  const now = new Date('2026-10-24T00:00:00Z')

  afterEach(() => vi.unstubAllEnvs())

  it('binds the token to the user it was minted for', () => {
    const token = createVocabRecallTaskToken(PAYLOAD, USER_ID, now)

    expect(
      verifyVocabRecallTaskToken({ now, token, userId: USER_ID })
    ).toMatchObject({ taskId: 'task-1' })
    expect(
      verifyVocabRecallTaskToken({ now, token, userId: 'guest_someone-else' })
    ).toBeNull()
  })

  it('rejects a token signed the old way (payload-only HMAC)', () => {
    vi.stubEnv('AUTH_SECRET', 'test-secret')
    const encodedPayload = Buffer.from(
      JSON.stringify({
        ...PAYLOAD,
        expiresAt: now.getTime() + 60_000,
        userId: USER_ID,
      })
    ).toString('base64url')
    const legacySignature = createHmac('sha256', 'test-secret')
      .update(encodedPayload)
      .digest('base64url')

    expect(
      verifyVocabRecallTaskToken({
        now,
        token: `${encodedPayload}.${legacySignature}`,
        userId: USER_ID,
      })
    ).toBeNull()
  })

  it('rejects an expired token', () => {
    const token = createVocabRecallTaskToken(PAYLOAD, USER_ID, now)

    expect(
      verifyVocabRecallTaskToken({
        now: new Date(now.getTime() + 31 * 60_000),
        token,
        userId: USER_ID,
      })
    ).toBeNull()
  })
})

describe('gradeVocabRecallAnswer', () => {
  it('grades choice tasks by option id', () => {
    expect(
      gradeVocabRecallAnswer({
        correctOptionId: 'option-2',
        selectedOptionId: 'option-2',
      })
    ).toBe(true)
    expect(
      gradeVocabRecallAnswer({
        correctOptionId: 'option-2',
        selectedOptionId: 'option-1',
      })
    ).toBe(false)
  })

  it('grades self-assessed tasks by the remember action', () => {
    expect(
      gradeVocabRecallAnswer({ action: 'remember', correctOptionId: null })
    ).toBe(true)
    expect(
      gradeVocabRecallAnswer({ action: 'notSure', correctOptionId: null })
    ).toBe(false)
  })
})

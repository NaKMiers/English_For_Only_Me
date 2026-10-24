import { describe, expect, it } from 'vitest'

import {
  buildAttemptWrite,
  buildCompletionWrite,
  buildCursorWrite,
  buildPreferencesWrite,
  getPracticeLane,
  readAttemptWriteResult,
  readSessionFromWriteResult,
} from './practiceSync'

const sessionId = '507f1f77bcf86cd799439014'

describe('practice write builders', () => {
  it('puts every write for a session in one lane', () => {
    const lanes = [
      buildAttemptWrite(sessionId, {
        action: 'check',
        idempotencyKey: 'key-12345678',
        segmentId: 'seg',
        typedAnswer: 'hi',
      }).lane,
      buildCursorWrite(sessionId, { id: 'seg', order: 0 }).lane,
      buildPreferencesWrite(sessionId, {
        isVideoHidden: false,
        playbackSpeed: 1,
        showShortcuts: true,
      }).lane,
      buildCompletionWrite(sessionId).lane,
    ]

    expect(new Set(lanes)).toEqual(new Set([getPracticeLane(sessionId)]))
  })

  it('uses the idempotency key as the attempt outbox id and keeps it in the body', () => {
    const write = buildAttemptWrite(sessionId, {
      action: 'skip',
      idempotencyKey: 'key-12345678',
      segmentId: 'seg',
      typedAnswer: '',
    })

    expect(write).toMatchObject({
      id: 'key-12345678',
      method: 'POST',
      url: `/api/dictation/sessions/${sessionId}/attempts`,
    })
    expect(write.body).toMatchObject({ idempotencyKey: 'key-12345678' })
    expect(write.mergeKey).toBeUndefined()
  })

  it('merges cursor moves and preference changes, never attempts or completion', () => {
    expect(buildCursorWrite(sessionId, { id: 'a', order: 1 }).mergeKey).toBe(
      'cursor'
    )
    expect(
      buildPreferencesWrite(sessionId, {
        isVideoHidden: true,
        playbackSpeed: 1.25,
        showShortcuts: false,
      })
    ).toMatchObject({
      body: { isVideoHidden: true, playbackSpeed: 1.25, showShortcuts: false },
      mergeKey: 'preferences',
      method: 'PATCH',
    })
    expect(buildCompletionWrite(sessionId)).toMatchObject({
      body: { status: 'completed' },
      method: 'PATCH',
    })
    expect(buildCompletionWrite(sessionId).mergeKey).toBeUndefined()
  })
})

describe('write result readers', () => {
  it('ignores superseded writes', () => {
    expect(readSessionFromWriteResult({ superseded: true })).toBeNull()
    expect(readSessionFromWriteResult(null)).toBeNull()
    expect(
      readSessionFromWriteResult({ session: { id: sessionId } })
    ).toMatchObject({ id: sessionId })
  })

  it('reads the attempt and progress from an attempt response', () => {
    expect(
      readAttemptWriteResult({
        attempt: { id: 'a1' },
        progress: { attemptCount: 1, segmentId: 'seg' },
      })
    ).toEqual({
      attempt: { id: 'a1' },
      progress: { attemptCount: 1, segmentId: 'seg' },
    })
    expect(readAttemptWriteResult({ superseded: true })).toEqual({
      attempt: null,
      progress: null,
    })
  })
})

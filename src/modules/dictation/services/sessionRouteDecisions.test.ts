import { describe, expect, test } from 'vitest'

import {
  getSessionStartGuardDecision,
  parseSessionPatchRequest,
  parseSessionStartRequest,
  resolveSessionStart,
} from './sessionRouteDecisions'

const ownerId = 'owner-one'
const firstSegment = {
  _id: '507f1f77bcf86cd799439033',
  order: 0,
}
const video = {
  activeTranscriptId: '507f1f77bcf86cd799439022',
  status: 'ready',
}

describe('session route decisions', () => {
  test('validates session start payloads', () => {
    expect(parseSessionStartRequest({ videoId: 'bad-id' })).toMatchObject({
      ok: false,
      status: 400,
    })

    expect(
      parseSessionStartRequest({ videoId: '507f1f77bcf86cd799439011' })
    ).toMatchObject({
      ok: true,
      data: {
        videoId: '507f1f77bcf86cd799439011',
      },
    })
  })

  test('validates session patch payloads', () => {
    expect(parseSessionPatchRequest({ playbackSpeed: 9 })).toMatchObject({
      ok: false,
      status: 400,
    })

    expect(
      parseSessionPatchRequest({
        currentSegmentOrder: 2,
        playbackSpeed: 1.25,
      })
    ).toMatchObject({
      ok: true,
      data: {
        currentSegmentOrder: 2,
        playbackSpeed: 1.25,
      },
    })
  })

  test('blocks practice for a missing video, transcript, or segments', () => {
    expect(
      getSessionStartGuardDecision({
        firstSegment,
        video: null,
      })
    ).toMatchObject({ status: 404 })

    expect(
      getSessionStartGuardDecision({
        firstSegment,
        video: {
          ...video,
          activeTranscriptId: null,
        },
      })
    ).toMatchObject({ status: 409 })

    expect(
      getSessionStartGuardDecision({
        firstSegment: null,
        video,
      })
    ).toMatchObject({ status: 409 })
  })

  test('chooses resume for active sessions and start for new sessions', () => {
    expect(
      resolveSessionStart({
        existingSession: {
          completedAt: null,
          createdAt: new Date(),
          currentSegmentId: 'existing-segment',
          currentSegmentOrder: 4,
          id: 'session-one',
          isVideoHidden: false,
          lastActiveAt: new Date(),
          ownerId,
          playbackSpeed: 1,
          showShortcuts: true,
          startedAt: new Date(),
          status: 'active',
          transcriptId: 'transcript-one',
          updatedAt: new Date(),
          videoId: 'video-one',
        },
        firstSegment,
      })
    ).toMatchObject({
      currentSegmentId: 'existing-segment',
      currentSegmentOrder: 4,
      mode: 'resume',
    })

    expect(
      resolveSessionStart({
        existingSession: null,
        firstSegment,
      })
    ).toMatchObject({
      currentSegmentId: firstSegment._id,
      currentSegmentOrder: 0,
      mode: 'start',
    })
  })
})

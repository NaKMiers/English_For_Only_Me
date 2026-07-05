import { describe, expect, test } from 'vitest'

import {
  getSegmentBuildGuardDecision,
  getSegmentEditGuardDecision,
  parseSegmentEditRequest,
  parseSegmentIdParam,
  parseTranscriptIdParam,
} from './segmentRouteDecisions'

const ownerId = 'owner-one'
const transcript = {
  _id: '507f1f77bcf86cd799439011',
  ownerId,
  qualityStatus: 'ready',
  sourceHash: 'source-hash-one',
}
const video = {
  _id: '507f1f77bcf86cd799439022',
  activeTranscriptId: transcript._id,
  ownerId,
}

describe('segment route decisions', () => {
  test('rejects invalid route ids before database work', () => {
    expect(parseTranscriptIdParam('bad-id')).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(parseSegmentIdParam('bad-id')).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('validates segment edit payloads', () => {
    expect(
      parseSegmentEditRequest({
        action: 'edit',
        endMs: 1200,
        startMs: 2000,
        text: 'The timestamp order is wrong.',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
    })

    expect(
      parseSegmentEditRequest({
        action: 'split',
        splitAt: 8,
      })
    ).toMatchObject({
      ok: true,
      data: {
        action: 'split',
      },
    })
  })

  test('blocks segment building when ownership does not match', () => {
    expect(
      getSegmentBuildGuardDecision({
        ownerId,
        transcript: {
          ...transcript,
          ownerId: 'other-owner',
        },
        video,
      })
    ).toMatchObject({
      status: 404,
    })
  })

  test('blocks segment building for stale active transcript state', () => {
    expect(
      getSegmentBuildGuardDecision({
        ownerId,
        transcript,
        video: {
          ...video,
          activeTranscriptId: '507f1f77bcf86cd799439099',
        },
      })
    ).toMatchObject({
      status: 409,
    })
  })

  test('blocks segment editing when source hash is stale', () => {
    expect(
      getSegmentEditGuardDecision({
        ownerId,
        segmentSourceHash: 'old-hash',
        transcript,
        video,
      })
    ).toMatchObject({
      status: 409,
    })
  })
})

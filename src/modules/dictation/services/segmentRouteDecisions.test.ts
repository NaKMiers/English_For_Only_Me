import { describe, expect, test } from 'vitest'

import {
  getSegmentBuildGuardDecision,
  getSegmentEditGuardDecision,
  parseSegmentEditRequest,
  parseSegmentIdParam,
  parseTranscriptIdParam,
} from './segmentRouteDecisions'

const transcript = {
  _id: '507f1f77bcf86cd799439011',
  qualityStatus: 'ready',
  sourceHash: 'source-hash-one',
}
const video = {
  _id: '507f1f77bcf86cd799439022',
  activeTranscriptId: transcript._id,
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

  test('blocks segment building when the transcript is missing', () => {
    expect(
      getSegmentBuildGuardDecision({
        transcript: null,
        video,
      })
    ).toMatchObject({
      status: 404,
    })
  })

  test('blocks segment building for stale active transcript state', () => {
    expect(
      getSegmentBuildGuardDecision({
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
        segmentSourceHash: 'old-hash',
        transcript,
        video,
      })
    ).toMatchObject({
      status: 409,
    })
  })
})

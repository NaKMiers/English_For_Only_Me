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

  test('accepts a setHints payload with a hint array', () => {
    expect(
      parseSegmentEditRequest({
        action: 'setHints',
        hints: ['London', 'They'],
      })
    ).toMatchObject({
      ok: true,
      data: { action: 'setHints', hints: ['London', 'They'] },
    })
  })

  test('accepts an empty setHints array', () => {
    expect(
      parseSegmentEditRequest({ action: 'setHints', hints: [] })
    ).toMatchObject({
      ok: true,
      data: { action: 'setHints', hints: [] },
    })
  })

  test('rejects a setHints payload whose hints are not strings', () => {
    expect(
      parseSegmentEditRequest({ action: 'setHints', hints: [1, 2] })
    ).toMatchObject({ ok: false, status: 400 })
  })

  test('accepts a resetHints payload', () => {
    expect(parseSegmentEditRequest({ action: 'resetHints' })).toMatchObject({
      ok: true,
      data: { action: 'resetHints' },
    })
  })

  test('accepts a setTranslation payload', () => {
    expect(
      parseSegmentEditRequest({
        action: 'setTranslation',
        language: 'vi',
        text: 'Xin chào',
      })
    ).toMatchObject({
      ok: true,
      data: { action: 'setTranslation', language: 'vi', text: 'Xin chào' },
    })
  })

  test('accepts an empty setTranslation text (clears the override)', () => {
    expect(
      parseSegmentEditRequest({
        action: 'setTranslation',
        language: 'vi',
        text: '',
      })
    ).toMatchObject({ ok: true, data: { action: 'setTranslation', text: '' } })
  })

  test('rejects a setTranslation payload with no language', () => {
    expect(
      parseSegmentEditRequest({ action: 'setTranslation', text: 'Xin chào' })
    ).toMatchObject({ ok: false, status: 400 })
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

import { describe, expect, test } from 'vitest'

import {
  parseAdminEnrichRequest,
  parseItemStatusRequest,
  parseLookupEntryRequest,
  parseRecallAnswerRequest,
  parseSearchRequest,
} from './vocabularyRouteDecisions'

const objectId = '507f1f77bcf86cd799439011'

describe('vocabulary route decisions', () => {
  test('validates lookup payloads', () => {
    expect(parseLookupEntryRequest({ term: '' })).toMatchObject({
      ok: false,
      status: 400,
    })
    expect(parseLookupEntryRequest({ term: 'example' })).toMatchObject({
      data: { term: 'example' },
      ok: true,
    })
  })

  test('validates search params and default limit', () => {
    expect(parseSearchRequest(new URLSearchParams('q=example'))).toMatchObject({
      data: { limit: 12, q: 'example' },
      ok: true,
    })
    expect(parseSearchRequest(new URLSearchParams('q='))).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('validates item and recall ids', () => {
    expect(
      parseItemStatusRequest({
        status: 'shouldLearn',
        vocabEntryId: objectId,
      })
    ).toMatchObject({
      ok: true,
    })
    expect(
      parseRecallAnswerRequest({
        correct: true,
        itemId: 'bad',
      })
    ).toMatchObject({
      ok: false,
      status: 400,
    })
  })

  test('caps admin enrichment at 10', () => {
    expect(parseAdminEnrichRequest({ limit: 10 })).toMatchObject({
      data: { limit: 10 },
      ok: true,
    })
    expect(parseAdminEnrichRequest({ limit: 11 })).toMatchObject({
      ok: false,
      status: 400,
    })
  })
})

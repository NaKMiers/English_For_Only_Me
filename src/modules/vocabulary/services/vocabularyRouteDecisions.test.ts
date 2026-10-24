import { describe, expect, test } from 'vitest'

import {
  parseAdminEnrichRequest,
  parseItemStatusRequest,
  parseLookupEntryRequest,
  parseOccurrenceRecordRequest,
  parseRecallAnswerRequest,
  parseRecallDueRequest,
  parseSearchRequest,
  parseVocabWordListQuery,
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

  test('pages the due queue with a validated cursor', () => {
    const cursor = `v1.1700000500000.1700000000000.1700000100000.${objectId}`

    expect(parseRecallDueRequest(new URLSearchParams())).toMatchObject({
      data: { cursor: null, excludeListening: false, limit: 20 },
      ok: true,
    })
    expect(
      parseRecallDueRequest(new URLSearchParams({ cursor }))
    ).toMatchObject({
      data: {
        cursor: {
          dueAt: 1700000000000,
          dueBefore: 1700000500000,
          itemId: objectId,
          updatedAt: 1700000100000,
        },
      },
      ok: true,
    })
    expect(
      parseRecallDueRequest(new URLSearchParams({ cursor: 'bad' }))
    ).toMatchObject({ ok: false, status: 400 })
    expect(
      parseRecallDueRequest(new URLSearchParams({ limit: '1000' }))
    ).toMatchObject({ data: { limit: 50 }, ok: true })
  })

  test('parses word list pages and falls back on bad values', () => {
    expect(parseVocabWordListQuery({})).toEqual({
      page: 1,
      perPage: 50,
      view: 'learning',
    })
    expect(
      parseVocabWordListQuery({ page: '3', perPage: '20', view: 'mastered' })
    ).toEqual({ page: 3, perPage: 20, view: 'mastered' })
    expect(
      parseVocabWordListQuery({
        page: ['0', '9'],
        perPage: '9999',
        view: 'nope',
      })
    ).toEqual({ page: 1, perPage: 50, view: 'learning' })
  })

  test('validates occurrence records for cached lookups', () => {
    expect(
      parseOccurrenceRecordRequest({
        occurrence: { reason: 'clickedInAnswer', selectedText: 'expect' },
        vocabEntryId: objectId,
      })
    ).toMatchObject({ ok: true })
    expect(
      parseOccurrenceRecordRequest({
        occurrence: { reason: 'clickedInAnswer' },
        vocabEntryId: 'bad',
      })
    ).toMatchObject({ ok: false, status: 400 })
  })
})

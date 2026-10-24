import { describe, expect, test } from 'vitest'

import {
  buildVocabRecallDueFilter,
  decodeVocabRecallDueCursor,
  encodeVocabRecallDueCursor,
  getNextVocabRecallDueCursor,
} from './recallDueCursor'

const ITEM_ID = '507f1f77bcf86cd799439011'
const NOW = new Date('2026-10-24T10:00:00.000Z')

describe('vocab recall due cursor', () => {
  test('round-trips through its string form', () => {
    const cursor = {
      dueAt: 1_700_000_000_000,
      dueBefore: 1_700_000_500_000,
      itemId: ITEM_ID,
      updatedAt: 1_700_000_100_000,
    }

    expect(
      decodeVocabRecallDueCursor(encodeVocabRecallDueCursor(cursor))
    ).toEqual(cursor)
  })

  test('rejects anything that is not a v1 cursor', () => {
    expect(decodeVocabRecallDueCursor('')).toBeNull()
    expect(decodeVocabRecallDueCursor('v1.1.2.3.not-an-id')).toBeNull()
    expect(decodeVocabRecallDueCursor(`v2.1.2.3.${ITEM_ID}`)).toBeNull()
  })

  test('the first page reads everything due now', () => {
    expect(buildVocabRecallDueFilter({ cursor: null, now: NOW })).toEqual({
      dueAt: { $lte: NOW },
    })
  })

  test('later pages read strictly after the cursor and before the session start', () => {
    const cursor = {
      dueAt: NOW.getTime() - 60_000,
      dueBefore: NOW.getTime() - 1_000,
      itemId: ITEM_ID,
      updatedAt: NOW.getTime() - 30_000,
    }
    const filter = buildVocabRecallDueFilter({ cursor, now: NOW })
    const dueAt = new Date(cursor.dueAt)
    const updatedAt = new Date(cursor.updatedAt)

    // Cards answered wrong in this session are due "now", after dueBefore,
    // so they wait for the next session instead of looping back.
    expect(filter.dueAt).toEqual({ $lte: new Date(cursor.dueBefore) })
    expect(filter).toMatchObject({
      $or: [
        { dueAt: { $gt: dueAt } },
        { dueAt, updatedAt: { $gt: updatedAt } },
        { _id: { $gt: ITEM_ID }, dueAt, updatedAt },
      ],
    })
  })

  test('a short page has no next cursor', () => {
    expect(
      getNextVocabRecallDueCursor({
        cursor: null,
        items: [{ _id: ITEM_ID, dueAt: NOW, updatedAt: NOW }],
        limit: 20,
        now: NOW,
      })
    ).toBeNull()
  })

  test('a full page points past its last item and keeps the session start', () => {
    const items = Array.from({ length: 2 }, (_, index) => ({
      _id: index === 1 ? ITEM_ID : '507f1f77bcf86cd799439000',
      dueAt: new Date(NOW.getTime() - 1000 * (2 - index)),
      updatedAt: NOW,
    }))
    const first = getNextVocabRecallDueCursor({
      cursor: null,
      items,
      limit: 2,
      now: NOW,
    })

    expect(decodeVocabRecallDueCursor(first ?? '')).toEqual({
      dueAt: NOW.getTime() - 1000,
      dueBefore: NOW.getTime(),
      itemId: ITEM_ID,
      updatedAt: NOW.getTime(),
    })

    const later = new Date(NOW.getTime() + 60_000)
    const second = getNextVocabRecallDueCursor({
      cursor: decodeVocabRecallDueCursor(first ?? ''),
      items,
      limit: 2,
      now: later,
    })

    expect(decodeVocabRecallDueCursor(second ?? '')?.dueBefore).toBe(
      NOW.getTime()
    )
  })
})

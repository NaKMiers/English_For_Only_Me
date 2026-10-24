import { describe, expect, it } from 'vitest'

import { reviveDates, reviveDatesInList, toJsonSafe } from './jsonRecords'

interface Row {
  id: string
  createdAt: Date
  deletedAt: Date | null
  tags: string[]
}

const row: Row = {
  createdAt: new Date('2026-10-24T01:02:03.004Z'),
  deletedAt: null,
  id: 'a',
  tags: ['x'],
}

describe('json records', () => {
  it('round-trips dates to ISO strings', () => {
    expect(toJsonSafe(row)).toEqual({
      createdAt: '2026-10-24T01:02:03.004Z',
      deletedAt: null,
      id: 'a',
      tags: ['x'],
    })
  })

  it('stringifies ObjectId-like values through their toJSON', () => {
    const objectIdLike = { toJSON: () => '65f0c0ffee' }

    expect(toJsonSafe({ _id: objectIdLike })).toEqual({ _id: '65f0c0ffee' })
  })

  it('revives the named date fields and leaves nulls alone', () => {
    const revived = reviveDates<Row>(toJsonSafe(row), [
      'createdAt',
      'deletedAt',
    ])

    expect(revived.createdAt).toBeInstanceOf(Date)
    expect(revived.createdAt.getTime()).toBe(row.createdAt.getTime())
    expect(revived.deletedAt).toBeNull()
    expect(revived).toEqual(row)
  })

  it('revives every record in a list', () => {
    const revived = reviveDatesInList<Row>(toJsonSafe([row, row]), [
      'createdAt',
    ])

    expect(revived).toEqual([row, row])
  })
})

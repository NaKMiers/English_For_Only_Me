import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  assertOutboxOwnerMatchesUser,
  OutboxOwnerMismatchError,
  outboxOwnerMatchesUser,
  toClientOwnerKey,
} from '@/lib/auth/clientOwnerKey'

const USER_ID = 'b'.repeat(24)
const OTHER_ID = 'c'.repeat(24)

describe('toClientOwnerKey', () => {
  it('is the first 24 hex chars of sha256 and never the raw id', () => {
    const key = toClientOwnerKey(USER_ID)

    expect(key).toBe(
      createHash('sha256').update(USER_ID).digest('hex').slice(0, 24)
    )
    expect(key).toMatch(/^[a-f0-9]{24}$/)
    expect(key).not.toBe(USER_ID)
    expect(toClientOwnerKey(USER_ID)).toBe(key)
    expect(toClientOwnerKey(OTHER_ID)).not.toBe(key)
  })
})

describe('outboxOwnerMatchesUser', () => {
  it('passes when no header was sent', () => {
    expect(outboxOwnerMatchesUser(null, USER_ID)).toBe(true)
    expect(outboxOwnerMatchesUser(undefined, USER_ID)).toBe(true)
  })

  // An outbox rendered outside OutboxOwnerProvider queues under '' and sends
  // the header empty: it must not land for whoever is signed in.
  it('rejects an empty owner header', () => {
    expect(outboxOwnerMatchesUser('', USER_ID)).toBe(false)
    expect(() => assertOutboxOwnerMatchesUser('', USER_ID)).toThrow(
      OutboxOwnerMismatchError
    )
  })

  it('passes when the header is the user client key', () => {
    expect(outboxOwnerMatchesUser(toClientOwnerKey(USER_ID), USER_ID)).toBe(
      true
    )
  })

  it('rejects another learner key', () => {
    expect(outboxOwnerMatchesUser(toClientOwnerKey(OTHER_ID), USER_ID)).toBe(
      false
    )
  })

  // Old tabs queued writes under 'anonymous' before sign-in was required.
  it('rejects the old anonymous owner for every user', () => {
    expect(outboxOwnerMatchesUser('anonymous', USER_ID)).toBe(false)
  })

  it('throws a 409 mismatch error', () => {
    expect(() => assertOutboxOwnerMatchesUser('anonymous', USER_ID)).toThrow(
      OutboxOwnerMismatchError
    )
    expect(new OutboxOwnerMismatchError().status).toBe(409)
    expect(() =>
      assertOutboxOwnerMatchesUser(toClientOwnerKey(USER_ID), USER_ID)
    ).not.toThrow()
  })
})

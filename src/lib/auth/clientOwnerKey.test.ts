import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
  assertOutboxOwnerMatchesActor,
  OutboxOwnerMismatchError,
  outboxOwnerMatchesActor,
  toClientOwnerKey,
} from '@/lib/auth/clientOwnerKey'

const GUEST_ID = `guest_${'a'.repeat(32)}`
const USER_ID = 'b'.repeat(24)

describe('toClientOwnerKey', () => {
  it('is the first 24 hex chars of sha256 and never the raw id', () => {
    const key = toClientOwnerKey(GUEST_ID)

    expect(key).toBe(
      createHash('sha256').update(GUEST_ID).digest('hex').slice(0, 24)
    )
    expect(key).toMatch(/^[a-f0-9]{24}$/)
    expect(key).not.toContain(GUEST_ID)
    expect(toClientOwnerKey(GUEST_ID)).toBe(key)
    expect(toClientOwnerKey(USER_ID)).not.toBe(key)
  })
})

describe('outboxOwnerMatchesActor', () => {
  const guest = { id: GUEST_ID, isGuest: true }
  const user = { id: USER_ID, isGuest: false }

  it('passes when no header was sent', () => {
    expect(outboxOwnerMatchesActor(null, user)).toBe(true)
    expect(outboxOwnerMatchesActor(undefined, guest)).toBe(true)
    expect(outboxOwnerMatchesActor('', guest)).toBe(true)
  })

  it('passes when the header is the actor client key', () => {
    expect(outboxOwnerMatchesActor(toClientOwnerKey(USER_ID), user)).toBe(true)
    expect(outboxOwnerMatchesActor(toClientOwnerKey(GUEST_ID), guest)).toBe(
      true
    )
  })

  it('rejects another learner key', () => {
    expect(outboxOwnerMatchesActor(toClientOwnerKey(GUEST_ID), user)).toBe(
      false
    )
    expect(outboxOwnerMatchesActor(toClientOwnerKey(USER_ID), guest)).toBe(
      false
    )
  })

  it('lets anonymous writes through for a guest only', () => {
    expect(outboxOwnerMatchesActor('anonymous', guest)).toBe(true)
    expect(outboxOwnerMatchesActor('anonymous', user)).toBe(false)
  })

  it('throws a 409 mismatch error', () => {
    expect(() => assertOutboxOwnerMatchesActor('anonymous', user)).toThrow(
      OutboxOwnerMismatchError
    )
    expect(new OutboxOwnerMismatchError().status).toBe(409)
    expect(() =>
      assertOutboxOwnerMatchesActor(toClientOwnerKey(USER_ID), user)
    ).not.toThrow()
  })
})

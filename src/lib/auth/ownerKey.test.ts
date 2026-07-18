import { describe, expect, it } from 'vitest'

import {
  assertOwnerKey,
  InvalidOwnerKeyError,
  isValidOwnerKey,
  OWNER_KEY_PATTERN,
} from './ownerKey'

const USER_ID = '6a5074f66c2397cc339c6e78' // 24-hex ObjectId
const GUEST_ID = `guest_${'a'.repeat(32)}`

describe('ownerKey', () => {
  describe('isValidOwnerKey', () => {
    it('accepts a 24-hex user id and a guest id', () => {
      expect(isValidOwnerKey(USER_ID)).toBe(true)
      expect(isValidOwnerKey(GUEST_ID)).toBe(true)
      expect(isValidOwnerKey('guest_6525bb5983144a05b56a2045cdb8acf8')).toBe(true)
    })

    it('rejects null, undefined, and empty string', () => {
      expect(isValidOwnerKey(null)).toBe(false)
      expect(isValidOwnerKey(undefined)).toBe(false)
      expect(isValidOwnerKey('')).toBe(false)
    })

    it('rejects malformed shapes', () => {
      expect(isValidOwnerKey('6a5074f6')).toBe(false) // too short
      expect(isValidOwnerKey(`${USER_ID}0`)).toBe(false) // too long
      expect(isValidOwnerKey('6A5074F66C2397CC339C6E78')).toBe(false) // uppercase
      expect(isValidOwnerKey('guest_short')).toBe(false)
      expect(isValidOwnerKey('guest_' + 'g'.repeat(32))).toBe(false) // non-hex
      expect(isValidOwnerKey(123 as unknown)).toBe(false)
    })
  })

  describe('assertOwnerKey', () => {
    it('returns the key when valid', () => {
      expect(assertOwnerKey(USER_ID)).toBe(USER_ID)
      expect(assertOwnerKey(GUEST_ID)).toBe(GUEST_ID)
    })

    it('throws InvalidOwnerKeyError (status 400) when invalid', () => {
      for (const bad of [null, undefined, '', 'nope'])
        expect(() => assertOwnerKey(bad)).toThrow(InvalidOwnerKeyError)
      try {
        assertOwnerKey(null)
      } catch (error) {
        expect((error as InvalidOwnerKeyError).status).toBe(400)
      }
    })
  })

  it('OWNER_KEY_PATTERN is anchored (no partial matches)', () => {
    expect(OWNER_KEY_PATTERN.test(` ${USER_ID} `)).toBe(false)
    expect(OWNER_KEY_PATTERN.test(`x${USER_ID}`)).toBe(false)
  })
})

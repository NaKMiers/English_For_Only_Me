import { describe, expect, it } from 'vitest'

import {
  assertOwnerKey,
  InvalidOwnerKeyError,
  isValidOwnerKey,
  OWNER_KEY_PATTERN,
} from './ownerKey'

const USER_ID = '6a5074f66c2397cc339c6e78' // 24-hex ObjectId
// The shape anonymous ids used to have, before sign-in became required.
const LEGACY_ANONYMOUS_ID = `anon_${'a'.repeat(32)}`

describe('ownerKey', () => {
  describe('isValidOwnerKey', () => {
    it('accepts a 24-hex user id', () => {
      expect(isValidOwnerKey(USER_ID)).toBe(true)
    })

    it('rejects null, undefined, and empty string', () => {
      expect(isValidOwnerKey(null)).toBe(false)
      expect(isValidOwnerKey(undefined)).toBe(false)
      expect(isValidOwnerKey('')).toBe(false)
    })

    it('rejects anything that is not an ObjectId', () => {
      expect(isValidOwnerKey('6a5074f6')).toBe(false) // too short
      expect(isValidOwnerKey(`${USER_ID}0`)).toBe(false) // too long
      expect(isValidOwnerKey('6A5074F66C2397CC339C6E78')).toBe(false) // uppercase
      expect(isValidOwnerKey(LEGACY_ANONYMOUS_ID)).toBe(false)
      expect(isValidOwnerKey('a'.repeat(32))).toBe(false)
      expect(isValidOwnerKey(123 as unknown)).toBe(false)
    })
  })

  describe('assertOwnerKey', () => {
    it('returns the key when valid', () => {
      expect(assertOwnerKey(USER_ID)).toBe(USER_ID)
    })

    it('throws InvalidOwnerKeyError (status 400) when invalid', () => {
      for (const bad of [null, undefined, '', 'nope', LEGACY_ANONYMOUS_ID])
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

import { describe, expect, it } from 'vitest'

import { isDuplicateKeyError } from './duplicateKeyError'

describe('isDuplicateKeyError', () => {
  it('matches a MongoServerError duplicate key', () => {
    expect(isDuplicateKeyError({ code: 11000, message: 'E11000' })).toBe(true)
  })

  it('ignores other errors and non-objects', () => {
    expect(isDuplicateKeyError({ code: 112 })).toBe(false)
    expect(isDuplicateKeyError(new Error('boom'))).toBe(false)
    expect(isDuplicateKeyError(null)).toBe(false)
    expect(isDuplicateKeyError('11000')).toBe(false)
  })
})

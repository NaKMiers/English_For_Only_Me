import { afterEach, describe, expect, it } from 'vitest'

import {
  ENV_KEYS,
  getOptionalServerEnv,
  getRequiredServerEnv,
  hasMongoDbUri,
  MissingEnvironmentError,
} from './environments'

const originalEnv = {
  mongoDbUri: process.env[ENV_KEYS.mongoDbUri],
}

afterEach(() => {
  delete process.env.OPTIONAL_EMPTY_TEST
  delete process.env.REQUIRED_TEST
  delete process.env.MISSING_REQUIRED_TEST

  if (originalEnv.mongoDbUri === undefined)
    delete process.env[ENV_KEYS.mongoDbUri]
  else process.env[ENV_KEYS.mongoDbUri] = originalEnv.mongoDbUri
})

describe('environment helpers', () => {
  it('returns null for missing or blank optional server env values', () => {
    process.env.OPTIONAL_EMPTY_TEST = '   '

    expect(getOptionalServerEnv('OPTIONAL_MISSING_TEST')).toBeNull()
    expect(getOptionalServerEnv('OPTIONAL_EMPTY_TEST')).toBeNull()
  })

  it('trims required server env values', () => {
    process.env.REQUIRED_TEST = '  value  '

    expect(getRequiredServerEnv('REQUIRED_TEST')).toBe('value')
  })

  it('throws a typed error for missing required server env values', () => {
    expect(() => getRequiredServerEnv('MISSING_REQUIRED_TEST')).toThrow(
      MissingEnvironmentError
    )
  })

  it('reports whether MongoDB is configured without exposing the value', () => {
    delete process.env[ENV_KEYS.mongoDbUri]

    expect(hasMongoDbUri()).toBe(false)

    process.env[ENV_KEYS.mongoDbUri] = 'mongodb://user:password@example.test/db'

    expect(hasMongoDbUri()).toBe(true)
  })
})

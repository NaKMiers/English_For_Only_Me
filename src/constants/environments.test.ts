import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  ENV_KEYS,
  getOptionalServerEnv,
  getQwenApiKey,
  getQwenCompatibleBaseUrl,
  getQwenDebriefModel,
  getQwenHost,
  getQwenTranslationModel,
  getRequiredServerEnv,
  hasMongoDbUri,
  MissingEnvironmentError,
} from './environments'

const originalEnv = {
  mongoDbUri: process.env[ENV_KEYS.mongoDbUri],
}
const AI_ENV_NAMES = [
  ENV_KEYS.qwenApiKey,
  ENV_KEYS.qwenHost,
  ENV_KEYS.qwenDebriefModel,
  ENV_KEYS.qwenTranslationModel,
]
const originalAiEnv = Object.fromEntries(
  AI_ENV_NAMES.map(name => [name, process.env[name]])
)

afterEach(() => {
  delete process.env.OPTIONAL_EMPTY_TEST
  delete process.env.REQUIRED_TEST
  delete process.env.MISSING_REQUIRED_TEST

  if (originalEnv.mongoDbUri === undefined)
    delete process.env[ENV_KEYS.mongoDbUri]
  else process.env[ENV_KEYS.mongoDbUri] = originalEnv.mongoDbUri

  for (const name of AI_ENV_NAMES)
    if (originalAiEnv[name] === undefined) delete process.env[name]
    else process.env[name] = originalAiEnv[name]
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

describe('Qwen env', () => {
  beforeEach(() => {
    for (const name of AI_ENV_NAMES) delete process.env[name]
  })

  it('reads and trims DASHSCOPE_API_KEY', () => {
    expect(getQwenApiKey()).toBeNull()

    process.env[ENV_KEYS.qwenApiKey] = ' sk-qwen '

    expect(getQwenApiKey()).toBe('sk-qwen')
  })

  it('defaults to the international host', () => {
    expect(getQwenHost()).toBe('https://dashscope-intl.aliyuncs.com')
    expect(getQwenCompatibleBaseUrl()).toBe(
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'
    )
  })

  it('trims a custom host trailing slash', () => {
    process.env[ENV_KEYS.qwenHost] = 'https://ws.example.test//'

    expect(getQwenCompatibleBaseUrl()).toBe(
      'https://ws.example.test/compatible-mode/v1'
    )
  })

  it('falls back from the translation model to the debrief model', () => {
    expect(getQwenDebriefModel()).toBe('qwen3.8-flash')
    expect(getQwenTranslationModel()).toBe('qwen3.8-flash')

    process.env[ENV_KEYS.qwenDebriefModel] = 'qwen3.8-max'

    expect(getQwenTranslationModel()).toBe('qwen3.8-max')
  })
})

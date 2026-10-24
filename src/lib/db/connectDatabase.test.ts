import { describe, expect, it, vi } from 'vitest'

import {
  getConnectOptions,
  getManualSchemaConnectOptions,
} from './connectDatabase'

describe('getConnectOptions', () => {
  it('bounds server selection and the pool in every environment', () => {
    expect(getConnectOptions('development')).toEqual({
      bufferCommands: false,
      maxIdleTimeMS: 60_000,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15_000,
    })
  })

  it('turns off autoIndex and autoCreate only in production', () => {
    const options = getConnectOptions('production')

    expect(options.autoIndex).toBe(false)
    expect(options.autoCreate).toBe(false)
    expect(getConnectOptions('test').autoIndex).toBeUndefined()
  })
})

describe('getManualSchemaConnectOptions', () => {
  it('turns off autoCreate and autoIndex in every environment', () => {
    for (const nodeEnv of ['development', 'test', 'production'] as const) {
      const options = getManualSchemaConnectOptions(nodeEnv)

      expect(options.autoCreate).toBe(false)
      expect(options.autoIndex).toBe(false)
      expect(options.bufferCommands).toBe(false)
    }
  })
})

describe('connectDatabaseWhen', () => {
  it('connects only for a truthy value and passes it through', async () => {
    vi.resetModules()
    const connect = vi.fn(async () => ({}))
    vi.doMock('mongoose', () => ({ default: { connect } }))
    vi.doMock('@/constants/environments', () => ({
      getMongoDbUri: () => 'mongodb://example.invalid/test',
    }))
    const globals = globalThis as { mongooseCache?: unknown }
    const previous = globals.mongooseCache
    globals.mongooseCache = undefined

    const { connectDatabaseWhen } = await import('./connectDatabase')

    expect(await connectDatabaseWhen(Promise.resolve(null))).toBeNull()
    expect(await connectDatabaseWhen('')).toBe('')
    expect(connect).not.toHaveBeenCalled()
    expect(await connectDatabaseWhen(Promise.resolve('guest_1'))).toBe(
      'guest_1'
    )
    expect(connect).toHaveBeenCalledTimes(1)

    globals.mongooseCache = previous
    vi.doUnmock('mongoose')
    vi.doUnmock('@/constants/environments')
  })
})

import { describe, expect, it } from 'vitest'

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

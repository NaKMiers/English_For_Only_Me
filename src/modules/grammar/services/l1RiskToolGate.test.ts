import { afterEach, describe, expect, it, vi } from 'vitest'

import { isL1RiskToolEnabled } from './grammarRouteDecisions'

/**
 * The gate on the only route in the app that writes to a source file. A
 * deployed runtime must not reach it: on serverless the write vanishes without
 * error, and on a long-lived host it puts untracked edits into a running
 * deployment.
 */
describe('isL1RiskToolEnabled', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('is enabled in development', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(isL1RiskToolEnabled()).toBe(true)
  })

  it('is disabled in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(isL1RiskToolEnabled()).toBe(false)
  })

  it('is disabled under test, so a stray call cannot write the taxonomy', () => {
    vi.stubEnv('NODE_ENV', 'test')

    expect(isL1RiskToolEnabled()).toBe(false)
  })
})

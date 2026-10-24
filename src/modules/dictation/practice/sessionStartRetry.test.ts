import { describe, expect, it } from 'vitest'

import {
  getSessionStartRetryDelayMs,
  isRetryableSessionStartError,
  SESSION_START_RETRY_BASE_DELAY_MS,
  SESSION_START_RETRY_MAX_DELAY_MS,
} from './sessionStartRetry'

function errorWithStatus(status: number) {
  return Object.assign(new Error('Request failed.'), { status })
}

describe('isRetryableSessionStartError', () => {
  it('retries a request that never reached the server', () => {
    expect(isRetryableSessionStartError(new TypeError('Failed to fetch'))).toBe(
      true
    )
  })

  it('retries a server failure that may pass', () => {
    for (const status of [0, 408, 429, 500, 503])
      expect(isRetryableSessionStartError(errorWithStatus(status))).toBe(true)
  })

  it('treats a 4xx refusal, or an error with no status, as final', () => {
    for (const status of [400, 403, 404, 409])
      expect(isRetryableSessionStartError(errorWithStatus(status))).toBe(false)

    expect(isRetryableSessionStartError(new Error('Refused.'))).toBe(false)
    expect(isRetryableSessionStartError(null)).toBe(false)
  })
})

describe('getSessionStartRetryDelayMs', () => {
  it('doubles from the base delay up to the cap', () => {
    expect(getSessionStartRetryDelayMs(1)).toBe(
      SESSION_START_RETRY_BASE_DELAY_MS
    )
    expect(getSessionStartRetryDelayMs(2)).toBe(
      SESSION_START_RETRY_BASE_DELAY_MS * 2
    )
    expect(getSessionStartRetryDelayMs(30)).toBe(
      SESSION_START_RETRY_MAX_DELAY_MS
    )
  })
})

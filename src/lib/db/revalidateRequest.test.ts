import { describe, expect, it } from 'vitest'

import {
  decideRevalidateRequest,
  isRevalidateSecretValid,
} from './revalidateRequest'

const body = { tags: ['dictation-catalog'] }

describe('isRevalidateSecretValid', () => {
  it('accepts only an exact match', () => {
    expect(isRevalidateSecretValid('s3cret', 's3cret')).toBe(true)
    expect(isRevalidateSecretValid('s3cre', 's3cret')).toBe(false)
    expect(isRevalidateSecretValid('', 's3cret')).toBe(false)
  })

  it('is disabled when no secret is configured', () => {
    expect(isRevalidateSecretValid('anything', null)).toBe(false)
    expect(isRevalidateSecretValid(null, null)).toBe(false)
  })
})

describe('decideRevalidateRequest', () => {
  it('rejects an anonymous caller with no secret (401)', () => {
    expect(
      decideRevalidateRequest({
        body,
        configuredSecret: 's3cret',
        providedSecret: null,
        viewer: 'anonymous',
      })
    ).toMatchObject({ ok: false, status: 401 })
  })

  it('rejects a wrong secret (401)', () => {
    expect(
      decideRevalidateRequest({
        body,
        configuredSecret: 's3cret',
        providedSecret: 'nope',
        viewer: 'anonymous',
      })
    ).toMatchObject({ ok: false, status: 401 })
    expect(
      decideRevalidateRequest({
        body,
        configuredSecret: 's3cret',
        providedSecret: 'nope',
        viewer: 'user',
      })
    ).toMatchObject({ ok: false, status: 401 })
  })

  it('rejects any secret when none is configured (401)', () => {
    expect(
      decideRevalidateRequest({
        body,
        configuredSecret: null,
        providedSecret: 'guess',
        viewer: 'anonymous',
      })
    ).toMatchObject({ ok: false, status: 401 })
  })

  it('rejects a signed-in non-admin without a secret (403)', () => {
    expect(
      decideRevalidateRequest({
        body,
        configuredSecret: null,
        providedSecret: null,
        viewer: 'user',
      })
    ).toMatchObject({ ok: false, status: 403 })
  })

  it('rejects unknown or missing tags (400)', () => {
    for (const badBody of [
      { tags: ['everything'] },
      { tags: [] },
      { tags: 'dictation-catalog' },
      null,
    ])
      expect(
        decideRevalidateRequest({
          body: badBody,
          configuredSecret: null,
          providedSecret: null,
          viewer: 'admin',
        })
      ).toMatchObject({ ok: false, status: 400 })
  })

  it('accepts an admin session without a secret', () => {
    expect(
      decideRevalidateRequest({
        body: { tags: ['grammar-content', 'dictation-catalog'] },
        configuredSecret: null,
        providedSecret: null,
        viewer: 'admin',
      })
    ).toEqual({ ok: true, tags: ['grammar-content', 'dictation-catalog'] })
  })

  it('accepts the secret without a session and dedupes tags', () => {
    expect(
      decideRevalidateRequest({
        body: { tags: ['grammar-content', 'grammar-content'] },
        configuredSecret: 's3cret',
        providedSecret: 's3cret',
        viewer: 'anonymous',
      })
    ).toEqual({ ok: true, tags: ['grammar-content'] })
  })
})

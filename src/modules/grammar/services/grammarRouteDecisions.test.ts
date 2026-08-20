import { describe, expect, it } from 'vitest'

import {
  GRAMMAR_POINTS_DEFAULT_LIMIT,
  GRAMMAR_POINTS_MAX_LIMIT,
} from '@/modules/grammar/constants'

import {
  parseGrammarAcceptAnswerRequest,
  parseGrammarPointSlug,
  parseGrammarPointsQuery,
  parseGrammarReviewRequest,
} from './grammarRouteDecisions'

function query(params: Record<string, string>) {
  return parseGrammarPointsQuery(new URLSearchParams(params))
}

describe('parseGrammarPointsQuery', () => {
  it('applies defaults when nothing is supplied', () => {
    const result = query({})

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.limit).toBe(GRAMMAR_POINTS_DEFAULT_LIMIT)
    expect(result.data.page).toBe(1)
    expect(result.data.cefrLevel).toBeNull()
    expect(result.data.family).toBeNull()
    expect(result.data.complexity).toBeNull()
    expect(result.data.l1Risk).toBeNull()
    expect(result.data.reviewStatus).toBeNull()
    expect(result.data.q).toBeNull()
  })

  it('parses every filter', () => {
    const result = query({
      cefrLevel: 'B2',
      complexity: '4',
      family: 'conditionals',
      l1Risk: 'high',
      limit: '10',
      page: '3',
      q: 'perfect',
      reviewStatus: 'unverified',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data).toEqual({
      cefrLevel: 'B2',
      complexity: 4,
      family: 'conditionals',
      l1Risk: 'high',
      limit: 10,
      page: 3,
      q: 'perfect',
      reviewStatus: 'unverified',
    })
  })

  // Unset <select> elements submit an empty string; that means "no filter",
  // not "invalid enum".
  it('treats empty strings as absent filters', () => {
    const result = query({
      cefrLevel: '',
      complexity: '',
      family: '',
      l1Risk: '',
      q: '',
      reviewStatus: '',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.cefrLevel).toBeNull()
    expect(result.data.complexity).toBeNull()
    expect(result.data.family).toBeNull()
    expect(result.data.l1Risk).toBeNull()
    expect(result.data.q).toBeNull()
    expect(result.data.reviewStatus).toBeNull()
  })

  it('rejects an unknown enum value', () => {
    expect(query({ cefrLevel: 'B3' }).ok).toBe(false)
    expect(query({ family: 'nonsense' }).ok).toBe(false)
    expect(query({ l1Risk: 'extreme' }).ok).toBe(false)
    expect(query({ reviewStatus: 'maybe' }).ok).toBe(false)
  })

  it('rejects out-of-range complexity, limit, and page', () => {
    expect(query({ complexity: '0' }).ok).toBe(false)
    expect(query({ complexity: '6' }).ok).toBe(false)
    expect(query({ limit: '0' }).ok).toBe(false)
    expect(query({ limit: String(GRAMMAR_POINTS_MAX_LIMIT + 1) }).ok).toBe(
      false
    )
    expect(query({ page: '0' }).ok).toBe(false)
  })

  it('rejects a non-numeric limit', () => {
    expect(query({ limit: 'lots' }).ok).toBe(false)
  })
})

describe('parseGrammarPointSlug', () => {
  it('accepts a kebab-case slug', () => {
    const result = parseGrammarPointSlug('present-perfect-simple')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.slug).toBe('present-perfect-simple')
  })

  it('rejects malformed slugs', () => {
    expect(parseGrammarPointSlug('Present_Perfect').ok).toBe(false)
    expect(parseGrammarPointSlug('trailing-').ok).toBe(false)
    expect(parseGrammarPointSlug('').ok).toBe(false)
    expect(parseGrammarPointSlug(undefined).ok).toBe(false)
    expect(parseGrammarPointSlug(42).ok).toBe(false)
  })
})

describe('parseGrammarReviewRequest', () => {
  it('accepts a valid review payload', () => {
    const result = parseGrammarReviewRequest({
      reviewStatus: 'reviewed',
      slug: 'zero-article',
    })

    expect(result.ok).toBe(true)
  })

  it('rejects unknown keys and bad statuses', () => {
    expect(
      parseGrammarReviewRequest({
        extra: true,
        reviewStatus: 'reviewed',
        slug: 'zero-article',
      }).ok
    ).toBe(false)
    expect(
      parseGrammarReviewRequest({ reviewStatus: 'done', slug: 'zero-article' })
        .ok
    ).toBe(false)
  })
})

describe('parseGrammarAcceptAnswerRequest', () => {
  it('accepts a valid accept-answer payload', () => {
    const result = parseGrammarAcceptAnswerRequest({
      answer: "He's lived here for five years",
      drillId: 'd3',
      slug: 'present-perfect-simple',
    })

    expect(result.ok).toBe(true)
  })

  it('rejects an empty answer or missing drill id', () => {
    expect(
      parseGrammarAcceptAnswerRequest({
        answer: '   ',
        drillId: 'd3',
        slug: 'present-perfect-simple',
      }).ok
    ).toBe(false)
    expect(
      parseGrammarAcceptAnswerRequest({
        answer: 'ok',
        slug: 'present-perfect-simple',
      }).ok
    ).toBe(false)
  })
})

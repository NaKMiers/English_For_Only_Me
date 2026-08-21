import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import { applyL1RiskPatch } from './applyL1RiskPatch'

function row(
  overrides: Partial<GrammarContentFile[number]> = {}
): GrammarContentFile[number] {
  return {
    cefrLevel: 'A1',
    complexity: 3,
    family: 'articles-determiners',
    l1Risk: 'medium',
    order: 1,
    slug: 'definite-article-the',
    summary: 'English marks definiteness; Vietnamese does not.',
    title: 'The Definite Article',
    ...overrides,
  }
}

function taxonomy(): GrammarContentFile {
  return [row(), row({ order: 2, slug: 'zero-article', title: 'Zero Article' })]
}

describe('applyL1RiskPatch', () => {
  it('records a judgment on the named row only', () => {
    const result = applyL1RiskPatch(taxonomy(), {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.points[1].l1RiskObserved).toBe('high')
    expect(result.points[0].l1RiskObserved).toBeUndefined()
  })

  it('leaves the input untouched', () => {
    // The route reads the file, patches, then writes. If the patch mutated in
    // place, a validation failure would already have corrupted what is in
    // memory before anything decided not to write it.
    const original = taxonomy()

    applyL1RiskPatch(original, {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(original[1].l1RiskObserved).toBeUndefined()
  })

  it('clears a judgment when passed null', () => {
    const judged = taxonomy().map(point => ({
      ...point,
      l1RiskObserved: 'high' as const,
    }))

    const result = applyL1RiskPatch(judged, {
      l1RiskObserved: null,
      slug: 'zero-article',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.points[1].l1RiskObserved).toBeNull()
  })

  it('rejects an unknown slug', () => {
    const result = applyL1RiskPatch(taxonomy(), {
      l1RiskObserved: 'high',
      slug: 'not-a-real-point',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues[0].rule).toBe('unknown-slug')
  })

  it('rejects a value outside the enum', () => {
    const result = applyL1RiskPatch(taxonomy(), {
      l1RiskObserved: 'brutal' as never,
      slug: 'zero-article',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues[0].rule).toBe('enum')
  })

  /**
   * The check that makes the write safe. A patch is only allowed to land if what
   * it produces is a file `grammar:seed` would accept - otherwise a good
   * judgment could be written on top of a file that then fails validation, and
   * the builder would find out at seed time with no idea which change broke it.
   */
  it('rejects a patch whose result would fail validation', () => {
    const broken: GrammarContentFile = [
      row({ slug: 'zero-article', title: '' }),
    ]

    const result = applyL1RiskPatch(broken, {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.issues.some(issue => issue.rule === 'required-field')).toBe(
      true
    )
  })

  it('never touches l1Risk', () => {
    // `l1Risk` is a content contract: 12 drills and a Vietnamese explanation
    // are required at `high`. This tool records an opinion, so it must not be
    // able to invalidate shipped content.
    const result = applyL1RiskPatch(taxonomy(), {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.points[1].l1Risk).toBe('medium')
  })

  it('never touches reviewStatus', () => {
    // Judging a point hard is not reading its lesson. Marking it reviewed here
    // would clear the unverified banner without anyone having checked anything.
    const unreviewed = taxonomy().map(point => ({
      ...point,
      reviewStatus: 'unverified' as const,
    }))

    const result = applyL1RiskPatch(unreviewed, {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.points[1].reviewStatus).toBe('unverified')
    expect(result.points[1].reviewedAt).toBeUndefined()
  })

  it('is idempotent, so a double submit is harmless', () => {
    const once = applyL1RiskPatch(taxonomy(), {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(once.ok).toBe(true)
    if (!once.ok) return

    const twice = applyL1RiskPatch(once.points, {
      l1RiskObserved: 'high',
      slug: 'zero-article',
    })

    expect(twice.ok).toBe(true)
    if (!twice.ok) return

    expect(twice.points).toEqual(once.points)
  })
})

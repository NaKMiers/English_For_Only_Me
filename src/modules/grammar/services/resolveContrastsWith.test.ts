import { describe, expect, it } from 'vitest'

import { mergeContrastSlugs } from './resolveContrastsWith'

describe('mergeContrastSlugs', () => {
  it('returns the point own contrasts when nothing points back', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: ['past-simple-regular'],
        reverseContrasts: [],
        selfSlug: 'present-perfect-simple',
      })
    ).toEqual(['past-simple-regular'])
  })

  // The whole reason the reverse is derived: the paired lesson must show the
  // link even though only one side authored it.
  it('surfaces a contrast authored only on the other point', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: [],
        reverseContrasts: ['present-perfect-simple'],
        selfSlug: 'past-simple-regular',
      })
    ).toEqual(['present-perfect-simple'])
  })

  it('dedupes when both directions were authored', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: ['past-simple-regular'],
        reverseContrasts: ['past-simple-regular'],
        selfSlug: 'present-perfect-simple',
      })
    ).toEqual(['past-simple-regular'])
  })

  it('drops a self-reference from either direction', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: ['present-perfect-simple', 'past-simple-regular'],
        reverseContrasts: ['present-perfect-simple'],
        selfSlug: 'present-perfect-simple',
      })
    ).toEqual(['past-simple-regular'])
  })

  it('drops empty slugs and returns a stable sorted order', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: ['zero-article', ''],
        reverseContrasts: ['definite-article-the'],
        selfSlug: 'indefinite-article-a-an',
      })
    ).toEqual(['definite-article-the', 'zero-article'])
  })

  it('returns an empty list when there are no contrasts at all', () => {
    expect(
      mergeContrastSlugs({
        ownContrasts: [],
        reverseContrasts: [],
        selfSlug: 'fronting',
      })
    ).toEqual([])
  })
})

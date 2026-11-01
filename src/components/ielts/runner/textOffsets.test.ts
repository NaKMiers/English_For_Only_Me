import { describe, expect, it } from 'vitest'

import { boxBreaks, offsetWithin, rangeFromOffsets } from './textOffsets'

function scope() {
  const element = document.createElement('div')

  element.innerHTML = '<p>Hello <b>brave</b> new</p><p>world</p>'

  return element
}

describe('text offsets', () => {
  it('measures a boundary inside a nested text node', () => {
    const root = scope()
    const brave = root.querySelector('b')?.firstChild as Text

    expect(offsetWithin(root, brave, 2)).toBe('Hello br'.length)
  })

  it('rebuilds a range across text nodes from offsets', () => {
    const root = scope()
    const range = rangeFromOffsets(root, 6, 15)

    expect(range?.toString()).toBe('brave new')
  })

  it('marks where one block ends and the next begins, not inline tags', () => {
    expect([...boxBreaks(scope())]).toEqual(['Hello brave new'.length])
  })

  it('returns null when the offsets run past the text', () => {
    expect(rangeFromOffsets(scope(), 0, 99)).toBeNull()
  })
})

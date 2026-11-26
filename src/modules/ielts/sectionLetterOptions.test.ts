import { describe, expect, it } from 'vitest'

import { onlyNamesSections } from './sectionLetterOptions'

const options = (...texts: string[]) =>
  texts.map((text, index) => ({ key: String.fromCharCode(65 + index), text }))

describe('onlyNamesSections', () => {
  it('is true for "Paragraph A" style options', () => {
    expect(onlyNamesSections(options('Paragraph A', 'Paragraph B'))).toBe(true)
    expect(onlyNamesSections(options('Section A', 'section B.'))).toBe(true)
    expect(onlyNamesSections(options('', 'B'))).toBe(true)
  })

  it('is false for real options and mismatched letters', () => {
    expect(onlyNamesSections(options('Ellen Weber', 'Ruth Mace'))).toBe(false)
    expect(onlyNamesSections(options('Paragraph B', 'Paragraph A'))).toBe(false)
    expect(onlyNamesSections([])).toBe(false)
  })
})

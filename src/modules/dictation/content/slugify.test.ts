import { describe, expect, it } from 'vitest'

import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugify('Short Stories')).toBe('short-stories')
    expect(slugify('TOEIC Listening!')).toBe('toeic-listening')
  })

  it('trims leading/trailing separators and collapses runs', () => {
    expect(slugify('  --Hello   World--  ')).toBe('hello-world')
    expect(slugify('A & B / C')).toBe('a-b-c')
  })

  it('falls back to "topic" when nothing usable remains', () => {
    expect(slugify('   ')).toBe('topic')
    expect(slugify('!!!')).toBe('topic')
  })
})

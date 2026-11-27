import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'

import { isLocale, resolveLocale } from './config'
import { format, plural } from './format'
import { formatNodes } from './formatNodes'

describe('format', () => {
  test('fills named placeholders', () => {
    expect(format('{done} of {total}', { done: 2, total: 5 })).toBe('2 of 5')
  })

  test('leaves an unknown placeholder visible', () => {
    expect(format('Hello, {name}', {})).toBe('Hello, {name}')
  })
})

describe('plural', () => {
  const forms = { one: '{count} word', other: '{count} words' }

  test('picks the form by count and fills {count}', () => {
    expect(plural(forms, 1)).toBe('1 word')
    expect(plural(forms, 0)).toBe('0 words')
    expect(plural(forms, 3)).toBe('3 words')
  })
})

describe('formatNodes', () => {
  test('places React nodes inside the sentence', () => {
    const html = renderToStaticMarkup(
      <p>{formatNodes('Press {key} to check', { key: <kbd>Enter</kbd> })}</p>
    )

    expect(html).toBe('<p>Press <kbd>Enter</kbd> to check</p>')
  })
})

describe('locale config', () => {
  test('falls back to English for unknown values', () => {
    expect(resolveLocale('vi')).toBe('vi')
    expect(resolveLocale('fr')).toBe('en')
    expect(resolveLocale(undefined)).toBe('en')
    expect(isLocale('en')).toBe(true)
    expect(isLocale('EN')).toBe(false)
  })
})

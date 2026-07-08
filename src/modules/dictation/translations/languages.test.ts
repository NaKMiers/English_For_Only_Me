import { describe, expect, test } from 'vitest'

import {
  getCuratedLanguageOptions,
  getLanguageLabel,
  isValidTranslationLanguage,
  normalizeTranslationLanguage,
} from './languages'

describe('isValidTranslationLanguage', () => {
  test('accepts common codes and regional variants', () => {
    expect(isValidTranslationLanguage('vi')).toBe(true)
    expect(isValidTranslationLanguage('ja')).toBe(true)
    expect(isValidTranslationLanguage('pt-BR')).toBe(true)
    expect(isValidTranslationLanguage('ZH')).toBe(true)
  })

  test('rejects malformed or out-of-range codes', () => {
    expect(isValidTranslationLanguage('')).toBe(false)
    expect(isValidTranslationLanguage('x')).toBe(false)
    expect(isValidTranslationLanguage('123')).toBe(false)
    expect(isValidTranslationLanguage('this-is-way-too-long')).toBe(false)
    expect(isValidTranslationLanguage('en_US')).toBe(false)
  })
})

describe('normalizeTranslationLanguage', () => {
  test('trims and lowercases', () => {
    expect(normalizeTranslationLanguage('  JA  ')).toBe('ja')
  })
})

describe('getLanguageLabel', () => {
  test('resolves a human label for a known code', () => {
    expect(getLanguageLabel('vi')).toBe('Vietnamese')
    expect(getLanguageLabel('ja')).toBe('Japanese')
  })

  test('falls back to the raw code for an unknown code', () => {
    expect(getLanguageLabel('qqq')).toBe('qqq')
  })
})

describe('getCuratedLanguageOptions', () => {
  test('returns code/label pairs including Vietnamese', () => {
    const options = getCuratedLanguageOptions()

    expect(options.length).toBeGreaterThan(10)
    expect(options.find(option => option.code === 'vi')?.label).toBe(
      'Vietnamese'
    )
  })
})

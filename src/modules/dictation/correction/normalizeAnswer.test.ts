import { describe, expect, test } from 'vitest'

import { normalizeAnswer } from './normalizeAnswer'

describe('normalizeAnswer', () => {
  test('forgives punctuation, capitalization, unicode apostrophes, and whitespace', () => {
    expect(normalizeAnswer('  I\u2019m ready, now. ').normalizedText).toBe(
      'i am ready now'
    )
  })

  test('normalizes number variants', () => {
    expect(
      normalizeAnswer('The second task has two parts.').normalizedText
    ).toBe('the 2 task has 2 parts')
    expect(normalizeAnswer('The 2nd task has 2 parts.').normalizedText).toBe(
      'the 2 task has 2 parts'
    )
    expect(normalizeAnswer('The twenty-first task.').normalizedText).toBe(
      'the 21 task'
    )
    expect(normalizeAnswer('one hundred and five people').normalizedText).toBe(
      '105 people'
    )
  })

  test('normalizes measurement unit variants', () => {
    expect(normalizeAnswer('five kilograms and 2 meters').normalizedText).toBe(
      '5 kg and 2 m'
    )
    expect(normalizeAnswer('5 kg and two metres').normalizedText).toBe(
      '5 kg and 2 m'
    )
    expect(normalizeAnswer('one litter of water').normalizedText).toBe(
      '1 l of water'
    )
    expect(normalizeAnswer('5kg, 10km, and 30°C').normalizedText).toBe(
      '5 kg 10 km and 30 celsius'
    )
  })

  test('normalizes percent, money, and time symbols', () => {
    expect(normalizeAnswer('10% at 7am costs $5').normalizedText).toBe(
      '10 percent at 7 am costs 5 usd'
    )
    expect(
      normalizeAnswer('ten per cent at seven a.m. costs five dollars')
        .normalizedText
    ).toBe('10 percent at 7 am costs 5 usd')
  })

  test('normalizes common British and American spelling variants', () => {
    expect(normalizeAnswer('My favourite colour is grey.').normalizedText).toBe(
      'my favorite color is gray'
    )
  })
})

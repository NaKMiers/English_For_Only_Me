import { describe, expect, it } from 'vitest'

import { toLemma } from './lemma'

describe('toLemma', () => {
  describe('regular inflection', () => {
    it.each([
      ['played', 'play'],
      ['watched', 'watch'],
      ['worked', 'work'],
      ['cleaned', 'clean'],
      ['lived', 'live'],
      ['arrived', 'arrive'],
      ['studied', 'study'],
      ['carried', 'carry'],
      ['tries', 'try'],
      ['reading', 'read'],
      ['cooking', 'cook'],
      ['playing', 'play'],
      ['running', 'run'],
      ['writing', 'write'],
      ['living', 'live'],
      ['watches', 'watch'],
      ['books', 'book'],
    ])('%s -> %s', (word, lemma) => {
      expect(toLemma(word)).toBe(lemma)
    })
  })

  describe('irregular forms', () => {
    it.each([
      ['went', 'go'],
      ['goes', 'go'],
      ['gone', 'go'],
      ['ate', 'eat'],
      ['saw', 'see'],
      ['bought', 'buy'],
      ['took', 'take'],
      ['written', 'write'],
      ['children', 'child'],
      ['people', 'person'],
    ])('%s -> %s', (word, lemma) => {
      expect(toLemma(word)).toBe(lemma)
    })
  })

  describe('words that are already the dictionary form', () => {
    it.each([
      ['advice', 'advice'],
      ['information', 'information'],
      ['water', 'water'],
      ['put', 'put'],
      ['eat', 'eat'],
      ['bus', 'bus'],
      ['glass', 'glass'],
    ])('%s stays %s', (word, lemma) => {
      expect(toLemma(word)).toBe(lemma)
    })
  })

  describe('refuses to guess rather than emitting a wrong cue', () => {
    it.each([
      // Undecidable from spelling: this could be "grip" or "gripe".
      ['griped'],
      ['sniping'],
    ])('%s has no confident lemma', word => {
      expect(toLemma(word)).toBeNull()
    })

    it('never produces a fragment instead of a word', () => {
      for (const word of ['played', 'reading', 'studied', 'watches', 'goes']) {
        const lemma = toLemma(word)

        expect(lemma).not.toBeNull()
        // "go" is two letters and a real word; anything shorter is a fragment.
        expect(lemma!.length).toBeGreaterThanOrEqual(2)
        expect(word.startsWith(lemma!.slice(0, 2))).toBe(true)
      }
    })
  })
})

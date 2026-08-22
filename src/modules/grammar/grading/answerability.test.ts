import { describe, expect, it } from 'vitest'

import {
  findUncuedAnswerWords,
  isAnswerableWithoutGuessing,
} from './answerability'

describe('findUncuedAnswerWords', () => {
  describe('answers made only of grammar words', () => {
    // These are the drills worth having. The blank has exactly one answer
    // because only one function word fits, so cueing would give it away.
    it.each([
      ['She ___ not drink tea.', 'does'],
      ['Complete the sentence: I ___ finished my homework.', 'have'],
      ['Complete the sentence: She ___ arrived.', 'has'],
      ['___ you like tea?', 'do'],
      ['I have lived here ___ 2019.', 'since'],
      ['There ___ three books on the table.', 'are'],
      ['He is taller ___ me.', 'than'],
      ['I need ___ advice.', 'some'],
    ])('%s -> %s', (prompt, target) => {
      expect(findUncuedAnswerWords({ prompt, target })).toEqual([])
    })
  })

  describe('answers that require reading the author’s mind', () => {
    // Every one of these has several equally correct answers, and nothing in
    // the question says which the author meant.
    it.each([
      ['I ___ football yesterday.', 'played', 'played'],
      ['She ___ dinner right now.', 'is cooking', 'cooking'],
      ['He ___ to work by bus.', 'goes', 'goes'],
      ['I need ___ before I decide.', 'some advice', 'advice'],
      ['I need ___ about the course.', 'some information', 'information'],
    ])('%s -> %s', (prompt, target, uncued) => {
      expect(findUncuedAnswerWords({ prompt, target })).toEqual([uncued])
    })
  })

  describe('a parenthetical cue makes them answerable', () => {
    it.each([
      ['I ___ (play) football yesterday.', 'played'],
      ['She ___ (cook) dinner right now.', 'is cooking'],
      ['He ___ (go) to work by bus.', 'goes'],
      ['I need ___ (advice) before I decide.', 'some advice'],
      ['I need ___ (information) about the course.', 'some information'],
      ['She ___ (live) in London for five years.', 'has lived'],
      ['They ___ (study) English last year.', 'studied'],
    ])('%s -> %s', (prompt, target) => {
      expect(findUncuedAnswerWords({ prompt, target })).toEqual([])
    })
  })

  it('counts a word already in the sentence as cued', () => {
    // "Reading" is in the prompt, so the learner is being asked for the tense,
    // not the verb.
    expect(
      findUncuedAnswerWords({
        prompt: 'He likes reading. He ___ a book right now.',
        target: 'is reading',
      })
    ).toEqual([])
  })

  it('names every uncued word, not just the first', () => {
    expect(
      findUncuedAnswerWords({
        prompt: 'She ___ yesterday.',
        target: 'visited Hanoi',
      })
    ).toEqual(['visited', 'hanoi'])
  })

  it('ignores punctuation and case', () => {
    expect(
      findUncuedAnswerWords({
        prompt: 'I need ___ (ADVICE), please.',
        target: 'Some advice',
      })
    ).toEqual([])
  })

  it('treats an empty target as answerable rather than throwing', () => {
    expect(findUncuedAnswerWords({ prompt: 'x ___', target: '' })).toEqual([])
  })
})

describe('isAnswerableWithoutGuessing', () => {
  it('only judges fillBlank', () => {
    // The other kinds carry their material by construction: correct and
    // transform embed the sentence, build lists the words.
    for (const kind of ['correct', 'transform', 'build', 'choice'])
      expect(
        isAnswerableWithoutGuessing({
          kind,
          prompt: 'Correct the sentence: Sun is bright.',
          target: 'The sun is bright.',
        })
      ).toBe(true)
  })

  it('rejects an uncued fillBlank', () => {
    expect(
      isAnswerableWithoutGuessing({
        kind: 'fillBlank',
        prompt: 'I ___ football yesterday.',
        target: 'played',
      })
    ).toBe(false)
  })

  it('accepts a cued fillBlank', () => {
    expect(
      isAnswerableWithoutGuessing({
        kind: 'fillBlank',
        prompt: 'I ___ (play) football yesterday.',
        target: 'played',
      })
    ).toBe(true)
  })

  it('accepts any kind once choices are on screen', () => {
    expect(
      isAnswerableWithoutGuessing({
        choices: ['played', 'play', 'playing'],
        kind: 'fillBlank',
        prompt: 'I ___ football yesterday.',
        target: 'played',
      })
    ).toBe(true)
  })
})

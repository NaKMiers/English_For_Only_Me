import { describe, expect, it } from 'vitest'

import type { GrammarDrillRecord } from '@/modules/grammar/types'

import {
  getCandidateAnswers,
  GRAMMAR_CORRECTION_OPTIONS,
  resolveGrammarAnswer,
  trimTerminalPunctuation,
} from './resolveGrammarAnswer'

function drill(
  overrides: Partial<GrammarDrillRecord> = {}
): GrammarDrillRecord {
  return {
    acceptedAnswers: [],
    choices: null,
    difficulty: 1,
    explanation: 'Present perfect links a past action to now.',
    id: 'd1',
    kind: 'transform',
    prompt: 'Rewrite using the present perfect.',
    target: 'He has lived here for five years',
    ...overrides,
  }
}

/**
 * DO NOT DELETE OR RELAX THESE TWO CASES.
 *
 * They look redundant - both answers are "obviously" different strings - but
 * they are the regression guard for the single worst bug this module can have.
 * `DEFAULT_CORRECTION_OPTIONS` sets expandContractions:true, and the expansion
 * table maps "he's" to "he is" and "he'd" to "he would". If anyone drops the
 * explicit GRAMMAR_CORRECTION_OPTIONS, both of these silently start PASSING,
 * and the app begins teaching ungrammatical English with a confident diff panel
 * pointing at the wrong expected word.
 *
 * There is no regression today. These tests exist so there never is one.
 */
describe('contraction ambiguity (regression guard)', () => {
  it('rejects "He is lived" against a present perfect target', () => {
    const result = resolveGrammarAnswer({
      answer: 'He is lived here for five years',
      drill: drill({
        acceptedAnswers: ["He's lived here for five years"],
        target: 'He has lived here for five years',
      }),
    })

    expect(result.isCorrect).toBe(false)
    expect(result.verdict).toBe('wrong')
  })

  it('rejects "He would left" against a past perfect target', () => {
    const result = resolveGrammarAnswer({
      answer: 'He would already left',
      drill: drill({
        acceptedAnswers: ["He'd already left"],
        target: 'He had already left',
      }),
    })

    expect(result.isCorrect).toBe(false)
  })

  it('still accepts the genuine contracted form of present perfect', () => {
    const result = resolveGrammarAnswer({
      answer: "He's lived here for five years",
      drill: drill({
        acceptedAnswers: ["He's lived here for five years"],
        target: 'He has lived here for five years',
      }),
    })

    expect(result.isCorrect).toBe(true)
    expect(result.matchedAnswer).toBe("He's lived here for five years")
  })

  it('still accepts the genuine contracted form of past perfect', () => {
    const result = resolveGrammarAnswer({
      answer: "He'd already left",
      drill: drill({
        acceptedAnswers: ["He'd already left"],
        target: 'He had already left',
      }),
    })

    expect(result.isCorrect).toBe(true)
  })

  it('pins the options that make the above hold', () => {
    expect(GRAMMAR_CORRECTION_OPTIONS.expandContractions).toBe(false)
    expect(GRAMMAR_CORRECTION_OPTIONS.ignorePunctuation).toBe(false)
  })
})

describe('trimTerminalPunctuation', () => {
  it('strips sentence-final punctuation but keeps contractions intact', () => {
    expect(trimTerminalPunctuation("He's lived here.")).toBe("He's lived here")
    expect(trimTerminalPunctuation('Where do you live?')).toBe(
      'Where do you live'
    )
    expect(trimTerminalPunctuation('Stop!')).toBe('Stop')
    expect(trimTerminalPunctuation('  spaced.  ')).toBe('spaced')
  })

  it('keeps internal punctuation', () => {
    expect(trimTerminalPunctuation("It's cold, so I'll stay.")).toBe(
      "It's cold, so I'll stay"
    )
  })
})

describe('getCandidateAnswers', () => {
  it('puts the target first and dedupes accepted answers', () => {
    const candidates = getCandidateAnswers(
      drill({
        acceptedAnswers: [
          'He has lived here for five years',
          "He's lived here for five years",
        ],
        target: 'He has lived here for five years',
      })
    )

    expect(candidates[0]).toBe('He has lived here for five years')
    expect(candidates).toHaveLength(2)
  })

  it('ignores blank accepted answers', () => {
    const candidates = getCandidateAnswers(
      drill({ acceptedAnswers: ['', '   '], target: 'One' })
    )

    expect(candidates).toEqual(['One'])
  })
})

describe('objective drills', () => {
  it('accepts an exact choice answer', () => {
    const result = resolveGrammarAnswer({
      answer: 'have lived',
      drill: drill({
        choices: ['have lived', 'am living', 'was living'],
        kind: 'choice',
        target: 'have lived',
      }),
    })

    expect(result.isCorrect).toBe(true)
    expect(result.correction).toBeNull()
  })

  it('rejects a wrong choice and reports the canonical answer', () => {
    const result = resolveGrammarAnswer({
      answer: 'am living',
      drill: drill({
        choices: ['have lived', 'am living'],
        kind: 'choice',
        target: 'have lived',
      }),
    })

    expect(result.isCorrect).toBe(false)
    expect(result.matchedAnswer).toBe('have lived')
  })

  it('ignores case and terminal punctuation on a fill-blank', () => {
    const result = resolveGrammarAnswer({
      answer: 'Have Lived.',
      drill: drill({ kind: 'fillBlank', target: 'have lived' }),
    })

    expect(result.isCorrect).toBe(true)
  })
})

describe('production drills', () => {
  it('accepts any listed variant', () => {
    for (const answer of [
      'He has lived here for five years',
      "He's lived here for five years",
      'He has lived here for 5 years',
    ])
      expect(
        resolveGrammarAnswer({
          answer,
          drill: drill({
            acceptedAnswers: [
              "He's lived here for five years",
              'He has lived here for 5 years',
            ],
          }),
        }).isCorrect,
        `${answer} should be accepted`
      ).toBe(true)
  })

  it('returns a token diff against the closest variant on a near miss', () => {
    const result = resolveGrammarAnswer({
      answer: 'He has live here for five years',
      drill: drill(),
    })

    expect(result.isCorrect).toBe(false)
    expect(result.matchedAnswer).toBe('He has lived here for five years')
    expect(result.correction).not.toBeNull()
    expect(result.score).toBeGreaterThan(0)
  })

  // The dictation engine calls "live" vs "lived" a spelling variant, which is
  // right for transcription and wrong here: on a present perfect drill that
  // missing participle IS the error under test. It must be marked wrong AND
  // score above zero, or candidate ranking cannot tell it from a perfect answer.
  it('treats a missing inflection as a real error, not a free spelling variant', () => {
    const result = resolveGrammarAnswer({
      answer: 'He has live here for five years',
      drill: drill(),
    })

    expect(result.isCorrect).toBe(false)
    expect(result.score).toBeGreaterThan(0)
  })

  it('picks the variant with the lowest scored distance', () => {
    // Submitted text is one token from the second variant and several from the
    // first, so the second must be chosen as the feedback baseline.
    const result = resolveGrammarAnswer({
      answer: 'I have never been to Paris',
      drill: drill({
        acceptedAnswers: ['I have never visited Paris'],
        target: 'I have never been to Paris before',
      }),
    })

    expect(result.matchedAnswer).toBe('I have never been to Paris before')
  })

  it('breaks a score tie in favour of the earlier candidate', () => {
    // Both variants are exactly one substitution away, so the target wins
    // because getCandidateAnswers puts it first.
    const result = resolveGrammarAnswer({
      answer: 'She has a cat',
      drill: drill({
        acceptedAnswers: ['She has one dog'],
        target: 'She has one cat',
      }),
    })

    expect(result.matchedAnswer).toBe('She has one cat')
  })

  it('reports a reveal without grading it', () => {
    const result = resolveGrammarAnswer({
      answer: '',
      drill: drill(),
      revealed: true,
    })

    expect(result.verdict).toBe('revealed')
    expect(result.isCorrect).toBe(false)
    expect(result.matchedAnswer).toBe('He has lived here for five years')
    expect(result.correction).toBeNull()
  })

  it('treats an empty answer as wrong rather than throwing', () => {
    const result = resolveGrammarAnswer({ answer: '   ', drill: drill() })

    expect(result.isCorrect).toBe(false)
    expect(result.verdict).toBe('wrong')
  })

  it('does not crash when a drill has no usable candidates', () => {
    const result = resolveGrammarAnswer({
      answer: 'anything',
      drill: drill({ acceptedAnswers: [], target: '' }),
    })

    expect(result.isCorrect).toBe(false)
    expect(result.matchedAnswer).toBeNull()
  })
})

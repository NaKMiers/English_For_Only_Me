import { describe, expect, it } from 'vitest'

import {
  validateGeneratedDrill,
  type GeneratedDrillDraft,
} from './validateGeneratedDrill'

function draft(overrides: Partial<GeneratedDrillDraft> = {}) {
  return {
    acceptedAnswers: ['He has lived here for five years'],
    choices: [],
    difficulty: 1,
    explanation: 'Present perfect links a past action to now.',
    kind: 'transform',
    prompt: 'Rewrite using the present perfect.',
    punctuationSensitive: false,
    target: 'He has lived here for five years',
    ...overrides,
  } satisfies GeneratedDrillDraft
}

describe('validateGeneratedDrill', () => {
  it('accepts a well-formed production drill', () => {
    const result = validateGeneratedDrill(draft())

    expect(result.ok).toBe(true)
  })

  it('accepts a well-formed choice drill', () => {
    const result = validateGeneratedDrill(
      draft({
        choices: ['He has lived here', 'He is lived here', 'He living here'],
        kind: 'choice',
        target: 'He has lived here',
        acceptedAnswers: ['He has lived here'],
      })
    )

    expect(result.ok).toBe(true)
  })

  /**
   * The rule that matters most.
   *
   * A question whose own target is missing from its accepted answers marks the
   * learner wrong for typing the model's own answer. That single outcome
   * destroys trust in the grader faster than anything else in the module, and it
   * cannot be fixed by generating more text - which is exactly why it is the
   * gate. See `constants.ts:171-193` for what happened the last time generated
   * content was trusted to fill a list.
   */
  it('rejects a target absent from its own accepted answers', () => {
    const result = validateGeneratedDrill(
      draft({ acceptedAnswers: ['Something else entirely'] })
    )

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({
      reason: expect.stringContaining('accepted answers'),
    })
  })

  it('accepts a target that differs from its accepted answer only by punctuation', () => {
    // The list is compared the way the grader compares, so an author who wrote
    // the target with a full stop and the accepted answer without has still
    // satisfied the rule.
    const result = validateGeneratedDrill(
      draft({
        acceptedAnswers: ['he has lived here for five years'],
        target: 'He has lived here for five years.',
      })
    )

    expect(result.ok).toBe(true)
  })

  it('rejects an empty prompt', () => {
    expect(validateGeneratedDrill(draft({ prompt: '   ' })).ok).toBe(false)
  })

  it('rejects an empty target', () => {
    expect(validateGeneratedDrill(draft({ target: '' })).ok).toBe(false)
  })

  it('rejects an empty explanation', () => {
    expect(validateGeneratedDrill(draft({ explanation: '' })).ok).toBe(false)
  })

  it('rejects an unknown kind', () => {
    expect(validateGeneratedDrill(draft({ kind: 'essay' })).ok).toBe(false)
  })

  it('rejects an over-long prompt', () => {
    expect(validateGeneratedDrill(draft({ prompt: 'x'.repeat(2001) })).ok).toBe(
      false
    )
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * These are verbatim from a real test the learner was served. Both were
   * accepted by the validator and both were impossible: "I need ___ before I
   * decide." expected "some advice", and nothing in the sentence says advice
   * rather than time, money or a moment. The learner correctly read the result
   * as the app being broken.
   */
  describe('unanswerable questions (regression guard)', () => {
    it('rejects a blank that requires inventing a noun', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['some advice'],
          kind: 'fillBlank',
          prompt: 'I need ___ before I decide.',
          target: 'some advice',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('Unanswerable'),
      })
    })

    it('rejects a blank that requires inventing a verb', () => {
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['played'],
            kind: 'fillBlank',
            prompt: 'I ___ football yesterday.',
            target: 'played',
          })
        ).ok
      ).toBe(false)
    })

    it('accepts the same question once the word is cued', () => {
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['some advice'],
            kind: 'fillBlank',
            prompt: 'I need ___ (advice) before I decide.',
            target: 'some advice',
          })
        ).ok
      ).toBe(true)
    })

    it('accepts a blank answered purely by grammar', () => {
      // No cue needed and none wanted: only one word fits, and it is the
      // grammar being tested.
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['does'],
            kind: 'fillBlank',
            prompt: 'She ___ not drink tea.',
            target: 'does',
          })
        ).ok
      ).toBe(true)
    })

    it('names the word that was left uncued', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['some information'],
          kind: 'fillBlank',
          prompt: 'I need ___ about the course.',
          target: 'some information',
        })
      )

      expect(result).toMatchObject({
        reason: expect.stringContaining('"information"'),
      })
    })
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * Found live, immediately after the cue rule shipped. The model satisfied
   * "cue the noun" by putting it in the sentence AND leaving it in the answer,
   * so the blank asked for "some" and the grader wanted "some advice". A
   * question that looks fair and cannot be passed is worse than one that
   * obviously cannot be answered.
   */
  describe('answers bigger than their blank (regression guard)', () => {
    it('rejects a target that repeats the word after the blank', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['some advice'],
          kind: 'fillBlank',
          prompt: 'I need ___ advice before I decide.',
          target: 'some advice',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('repeats "advice"'),
      })
    })

    it('rejects a target that repeats the word before the blank', () => {
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['get off'],
            kind: 'fillBlank',
            prompt: 'We get ___ the bus at the next stop.',
            target: 'get off',
          })
        ).ok
      ).toBe(false)
    })

    it('accepts the trimmed version', () => {
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['some'],
            kind: 'fillBlank',
            prompt: 'I need ___ advice before I decide.',
            target: 'some',
          })
        ).ok
      ).toBe(true)
    })

    it('sees through a possessive when finding the repeat', () => {
      // "My brother ___ car" answered by "My brother's car" repeats two words,
      // and the apostrophe is the thing being taught - it must not hide it.
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ["My brother's car"],
            kind: 'fillBlank',
            prompt: 'Complete the phrase: My brother ___ car',
            target: "My brother's car",
          })
        ).ok
      ).toBe(false)
    })

    it('allows a prompt that legitimately repeats itself', () => {
      // "had had" is correct English and "plural of cat: cat -> ___" repeats by
      // design. Only a repeat straddling the blank is a defect.
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['would have bought'],
            kind: 'fillBlank',
            prompt:
              'If they had had enough money, they ___ (buy) the house last year.',
            target: 'would have bought',
          })
        ).ok
      ).toBe(true)
    })
  })

  describe('questions with nothing to do', () => {
    it('rejects a correct-the-sentence drill whose prompt is already correct', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['The sun is very bright today.'],
          kind: 'correct',
          prompt: 'Correct the sentence: The sun is very bright today.',
          target: 'The sun is very bright today.',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('nothing to correct'),
      })
    })

    it('accepts one where the sentence really is wrong', () => {
      // The learner disputed this shape, but the error is real: "got used to"
      // takes a gerund, so "live" has to become "living".
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['She got used to living in London quickly.'],
            kind: 'correct',
            prompt:
              'Correct the sentence: She got used to live in London quickly.',
            target: 'She got used to living in London quickly.',
          })
        ).ok
      ).toBe(true)
    })

    it('rejects a rewrite that shows its own answer', () => {
      expect(
        validateGeneratedDrill(
          draft({
            acceptedAnswers: ['He has lived here for five years.'],
            kind: 'transform',
            prompt:
              'Rewrite using the present perfect: He has lived here for five years.',
            target: 'He has lived here for five years.',
          })
        ).ok
      ).toBe(false)
    })
  })

  describe('choice drills', () => {
    it('rejects a choice drill with fewer than two options', () => {
      const result = validateGeneratedDrill(
        draft({ choices: ['He has lived here'], kind: 'choice' })
      )

      expect(result.ok).toBe(false)
    })

    it('rejects a choice drill whose options exclude the target', () => {
      const result = validateGeneratedDrill(
        draft({
          choices: ['He is lived here', 'He living here'],
          kind: 'choice',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('exclude its target'),
      })
    })

    it('rejects a choice drill with no distractor', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['He has lived here'],
          choices: ['He has lived here', 'he has lived here.'],
          kind: 'choice',
          target: 'He has lived here',
        })
      )

      expect(result.ok).toBe(false)
    })

    it('rejects duplicate distractors', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['He has lived here'],
          choices: [
            'He has lived here',
            'He is lived here',
            'he is lived here.',
          ],
          kind: 'choice',
          target: 'He has lived here',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('Duplicate distractor'),
      })
    })

    /**
     * A distractor that is also an accepted answer marks the WRONG option
     * right. This is the shape that scored a learner correct for omitting the
     * definite article on a drill teaching the definite article.
     */
    it('rejects a distractor that is also an accepted answer', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['He has lived here', 'He is lived here'],
          choices: ['He has lived here', 'He is lived here'],
          kind: 'choice',
          target: 'He has lived here',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('also an accepted answer'),
      })
    })

    /**
     * REGRESSION GUARD - DO NOT DELETE.
     *
     * This exact drill came back from a live generation run against the real
     * taxonomy. Two of its three options differ ONLY by the commas, which is
     * the entire subject of the lesson - and under punctuation-tolerant grading
     * they are the same string.
     *
     * With the validator comparing tolerantly regardless of the drill's own
     * flag, the comma-less option was absorbed as "another spelling of the
     * target" rather than seen as a distractor, so nothing was rejected. Then a
     * learner clicking the comma-less option on a non-defining relative clause
     * question would be told they were RIGHT.
     *
     * Two ways out, both correct, and the validator accepts either: mark the
     * drill punctuationSensitive so the options really are distinct, or do not
     * build a question whose options differ only by punctuation.
     */
    it('rejects options that differ only by punctuation on a tolerant drill', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: [
            'The book, which I borrowed from you, is on my desk.',
          ],
          choices: [
            'The book which I borrowed from you is on my desk.',
            'The book, which I borrowed from you, is on my desk.',
            'The book that I borrowed from you is on my desk.',
          ],
          kind: 'choice',
          punctuationSensitive: false,
          target: 'The book, which I borrowed from you, is on my desk.',
        })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('grade as the target'),
      })
    })

    it('accepts that same drill when it is marked punctuationSensitive', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: [
            'The book, which I borrowed from you, is on my desk.',
          ],
          choices: [
            'The book which I borrowed from you is on my desk.',
            'The book, which I borrowed from you, is on my desk.',
            'The book that I borrowed from you is on my desk.',
          ],
          kind: 'choice',
          punctuationSensitive: true,
          target: 'The book, which I borrowed from you, is on my desk.',
        })
      )

      expect(result.ok).toBe(true)
    })

    it('rejects choices on a non-choice kind', () => {
      // Options rendered next to a free-text box are a leaked answer key.
      const result = validateGeneratedDrill(
        draft({ choices: ['a', 'b'], kind: 'transform' })
      )

      expect(result.ok).toBe(false)
      expect(result).toMatchObject({
        reason: expect.stringContaining('must not carry choices'),
      })
    })
  })

  describe('normalisation of the output', () => {
    it('trims whitespace and defaults difficulty to 1', () => {
      const result = validateGeneratedDrill(
        draft({ difficulty: 9, prompt: '  Rewrite it.  ' })
      )

      expect(result).toMatchObject({
        drill: { difficulty: 1, prompt: 'Rewrite it.' },
        ok: true,
      })
    })

    it('keeps a valid difficulty', () => {
      const result = validateGeneratedDrill(draft({ difficulty: 3 }))

      expect(result).toMatchObject({ drill: { difficulty: 3 } })
    })

    it('coerces punctuationSensitive to a real boolean', () => {
      expect(
        validateGeneratedDrill(draft({ punctuationSensitive: 'yes' }))
      ).toMatchObject({ drill: { punctuationSensitive: false } })
      expect(
        validateGeneratedDrill(draft({ punctuationSensitive: true }))
      ).toMatchObject({ drill: { punctuationSensitive: true } })
    })

    it('drops blank entries from the accepted list', () => {
      const result = validateGeneratedDrill(
        draft({
          acceptedAnswers: ['He has lived here for five years', '  ', ''],
        })
      )

      expect(result).toMatchObject({
        drill: { acceptedAnswers: ['He has lived here for five years'] },
        ok: true,
      })
    })

    it('survives entirely malformed input without throwing', () => {
      for (const bad of [{}, { kind: 42 }, { acceptedAnswers: 'nope' }])
        expect(() =>
          validateGeneratedDrill(bad as GeneratedDrillDraft)
        ).not.toThrow()
    })
  })
})

import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import {
  applyPunctuationFlags,
  proposePunctuationFlags,
} from './resolvePunctuationFlags'

function drill(overrides: Record<string, unknown> = {}) {
  return {
    acceptedAnswers: ['The man, who left, waved'],
    choices: null,
    difficulty: 1 as const,
    explanation: 'Non-defining clauses take commas.',
    id: 'd1',
    kind: 'transform' as const,
    prompt: 'Add the commas.',
    target: 'The man, who left, waved',
    ...overrides,
  }
}

function point(
  overrides: Partial<GrammarContentFile[number]> = {}
): GrammarContentFile[number] {
  return {
    cefrLevel: 'B1',
    complexity: 3,
    family: 'relative-clauses',
    l1Risk: 'high',
    order: 1,
    slug: 'non-defining-relative-clauses',
    summary: 'Adds extra information.',
    title: 'Non-defining Relative Clauses',
    ...overrides,
  }
}

describe('proposePunctuationFlags', () => {
  it('flags a relative-clause drill whose target has commas', () => {
    const proposals = proposePunctuationFlags([point({ drills: [drill()] })])

    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toMatchObject({
      drillId: 'd1',
      slug: 'non-defining-relative-clauses',
    })
  })

  it('flags a question tag', () => {
    const proposals = proposePunctuationFlags([
      point({
        drills: [drill({ target: "She likes tea, doesn't she?" })],
        family: 'questions-negation',
        slug: 'question-tags',
      }),
    ])

    expect(proposals).toHaveLength(1)
  })

  it('flags direct speech', () => {
    const proposals = proposePunctuationFlags([
      point({
        drills: [drill({ target: 'He said, "I will go"' })],
        family: 'reported-speech',
        slug: 'direct-speech',
      }),
    ])

    expect(proposals).toHaveLength(1)
  })

  /**
   * REGRESSION GUARD - DO NOT DELETE.
   *
   * `discourse-connectors` was in the family list until the backfill was run
   * against the real taxonomy: it produced 75 of 95 proposed flips, and every
   * one was a comma whose omission changes nothing. "I can stay but I need to
   * leave early" is correct English, and a grader that rejects it has recreated
   * the false-rejection problem this whole feature exists to remove.
   *
   * A lesson merely MENTIONING a comma is the same trap: "a fronted adverbial
   * usually takes a comma" is a note about convention, not a rule under test.
   */
  describe('style-only marks stay tolerant (regression guard)', () => {
    it('does not flag a comma before a coordinating conjunction', () => {
      expect(
        proposePunctuationFlags([
          point({
            drills: [
              drill({ target: 'I can stay, but I need to leave early' }),
            ],
            family: 'discourse-connectors',
            slug: 'and-but-or',
          }),
        ])
      ).toEqual([])
    })

    it('does not flag a comma after a fronted adverbial', () => {
      expect(
        proposePunctuationFlags([
          point({
            drills: [drill({ target: 'On the table, I left my phone' })],
            explanation: 'A fronted phrase usually takes a comma.',
            family: 'word-order-inversion',
            slug: 'fronting',
          }),
        ])
      ).toEqual([])
    })

    it('does not flag a participle clause', () => {
      expect(
        proposePunctuationFlags([
          point({
            drills: [
              drill({ target: 'Not knowing the answer, I stayed silent' }),
            ],
            family: 'discourse-connectors',
            slug: 'participle-clauses-adverbial',
          }),
        ])
      ).toEqual([])
    })

    it('does not flag on a lesson mention alone', () => {
      expect(
        proposePunctuationFlags([
          point({
            drills: [drill()],
            explanation: 'Use a comma before the connector.',
            family: 'verb-tenses',
            slug: 'unrelated',
          }),
        ])
      ).toEqual([])
    })
  })

  /**
   * The condition that keeps this from flagging four whole families. A
   * relative-clause drill with no comma in its target has no comma to enforce,
   * so flagging it makes the grader stricter for no teaching gain.
   */
  it('does not flag a drill whose target has no internal punctuation', () => {
    const proposals = proposePunctuationFlags([
      point({
        drills: [drill({ target: 'The man who left waved' })],
      }),
    ])

    expect(proposals).toEqual([])
  })

  it('does not flag a target whose only punctuation is terminal', () => {
    // Terminal marks are trimmed on both sides regardless of the flag, so they
    // carry no signal.
    const proposals = proposePunctuationFlags([
      point({ drills: [drill({ target: 'The man who left waved.' })] }),
    ])

    expect(proposals).toEqual([])
  })

  it('ignores families where punctuation is not the rule', () => {
    const proposals = proposePunctuationFlags([
      point({
        drills: [drill()],
        family: 'verb-tenses',
        slug: 'present-perfect',
      }),
    ])

    expect(proposals).toEqual([])
  })

  it('never overwrites an explicit decision', () => {
    for (const punctuationSensitive of [true, false])
      expect(
        proposePunctuationFlags([
          point({ drills: [drill({ punctuationSensitive })] }),
        ])
      ).toEqual([])
  })

  it('skips generated drills', () => {
    // Generated drills carry a flag set by the model at authoring time; a
    // backfill has no business second-guessing it.
    expect(
      proposePunctuationFlags([point({ drills: [drill({ generated: true })] })])
    ).toEqual([])
  })

  it('skips merged-away points', () => {
    expect(
      proposePunctuationFlags([
        point({ drills: [drill()], mergedInto: 'survivor' }),
      ])
    ).toEqual([])
  })

  it('flags a hyphen only between words', () => {
    expect(
      proposePunctuationFlags([
        point({ drills: [drill({ target: 'A well-known author waved' })] }),
      ])
    ).toHaveLength(1)
  })

  it('handles a point with no drills', () => {
    expect(proposePunctuationFlags([point()])).toEqual([])
  })
})

describe('applyPunctuationFlags', () => {
  it('sets the flag only on the proposed drills', () => {
    const points = [
      point({
        drills: [drill({ id: 'd1' }), drill({ id: 'd2' })],
      }),
    ]
    const result = applyPunctuationFlags(points, [
      {
        drillId: 'd1',
        reason: 'family relative-clauses',
        slug: 'non-defining-relative-clauses',
        target: 'x',
      },
    ])

    expect(result[0].drills?.[0].punctuationSensitive).toBe(true)
    expect(result[0].drills?.[1].punctuationSensitive).toBeUndefined()
  })

  it('leaves untouched points alone', () => {
    const points = [point({ drills: [drill()] }), point({ slug: 'other' })]
    const result = applyPunctuationFlags(points, [])

    expect(result[0].drills?.[0].punctuationSensitive).toBeUndefined()
    expect(result[1]).toEqual(points[1])
  })

  it('does not mutate the input', () => {
    const points = [point({ drills: [drill()] })]

    applyPunctuationFlags(points, [
      {
        drillId: 'd1',
        reason: 'family relative-clauses',
        slug: 'non-defining-relative-clauses',
        target: 'x',
      },
    ])

    expect(points[0].drills?.[0].punctuationSensitive).toBeUndefined()
  })
})

import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import { applyFillBlankCues, proposeFillBlankCues } from './cueFillBlankPrompts'

function drill(overrides: Record<string, unknown> = {}) {
  return {
    acceptedAnswers: ['played'],
    choices: null,
    difficulty: 1 as const,
    explanation: 'Past simple for a finished action.',
    id: 'd1',
    kind: 'fillBlank' as const,
    prompt: 'I ___ football yesterday.',
    target: 'played',
    ...overrides,
  }
}

function point(
  overrides: Partial<GrammarContentFile[number]> = {}
): GrammarContentFile[number] {
  return {
    cefrLevel: 'A1',
    complexity: 1,
    family: 'verb-tenses',
    l1Risk: 'high',
    order: 1,
    slug: 'past-simple-regular',
    summary: 'Finished actions.',
    title: 'Past Simple Regular',
    ...overrides,
  }
}

describe('proposeFillBlankCues', () => {
  it('cues an uncued verb blank with its dictionary form', () => {
    const { proposals } = proposeFillBlankCues([point({ drills: [drill()] })])

    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toMatchObject({
      cue: 'play',
      nextPrompt: 'I ___ (play) football yesterday.',
    })
  })

  it('cues a noun blank with the noun, leaving the quantifier to the learner', () => {
    // The grammar under test is "some", not "advice". Cueing the noun is what
    // makes the question about the quantifier instead of a guessing game.
    const { proposals } = proposeFillBlankCues([
      point({
        drills: [
          drill({
            acceptedAnswers: ['some advice'],
            prompt: 'I need ___ before I decide.',
            target: 'some advice',
          }),
        ],
      }),
    ])

    expect(proposals[0].nextPrompt).toBe('I need ___ (advice) before I decide.')
  })

  it('cues a continuous form with the bare verb', () => {
    const { proposals } = proposeFillBlankCues([
      point({
        drills: [
          drill({
            prompt: 'I ___ a book at the moment.',
            target: 'am reading',
          }),
        ],
      }),
    ])

    expect(proposals[0].nextPrompt).toBe('I ___ (read) a book at the moment.')
  })

  describe('leaves good drills alone', () => {
    it('skips a blank whose answer is only grammar', () => {
      const { proposals, skipped } = proposeFillBlankCues([
        point({
          drills: [
            drill({
              acceptedAnswers: ['does'],
              prompt: 'She ___ not drink tea.',
              target: 'does',
            }),
          ],
        }),
      ])

      expect(proposals).toEqual([])
      expect(skipped).toEqual([])
    })

    it('skips a blank already carrying a cue', () => {
      const { proposals } = proposeFillBlankCues([
        point({
          drills: [drill({ prompt: 'I ___ (play) football yesterday.' })],
        }),
      ])

      expect(proposals).toEqual([])
    })

    it('skips kinds other than fillBlank', () => {
      for (const kind of ['choice', 'correct', 'transform', 'build'])
        expect(
          proposeFillBlankCues([point({ drills: [drill({ kind })] })]).proposals
        ).toEqual([])
    })

    it('skips a drill that has choices', () => {
      expect(
        proposeFillBlankCues([
          point({ drills: [drill({ choices: ['played', 'play'] })] }),
        ]).proposals
      ).toEqual([])
    })

    it('skips generated drills', () => {
      expect(
        proposeFillBlankCues([point({ drills: [drill({ generated: true })] })])
          .proposals
      ).toEqual([])
    })

    it('skips merged-away points', () => {
      expect(
        proposeFillBlankCues([
          point({ drills: [drill()], mergedInto: 'survivor' }),
        ]).proposals
      ).toEqual([])
    })
  })

  it('cues every uncued word, alphabetically so word order is not given away', () => {
    const { proposals } = proposeFillBlankCues([
      point({
        drills: [
          drill({ prompt: 'She ___ yesterday.', target: 'visited Hanoi' }),
        ],
      }),
    ])

    expect(proposals[0].cue).toBe('hanoi / visit')
  })
})

describe('applyFillBlankCues', () => {
  it('rewrites only the proposed drills', () => {
    const points = [
      point({ drills: [drill({ id: 'd1' }), drill({ id: 'd2' })] }),
    ]
    const { proposals } = proposeFillBlankCues(points)
    const result = applyFillBlankCues(points, [proposals[0]])

    expect(result[0].drills?.[0].prompt).toBe(
      'I ___ (play) football yesterday.'
    )
    expect(result[0].drills?.[1].prompt).toBe('I ___ football yesterday.')
  })

  it('does not mutate the input', () => {
    const points = [point({ drills: [drill()] })]
    const { proposals } = proposeFillBlankCues(points)

    applyFillBlankCues(points, proposals)

    expect(points[0].drills?.[0].prompt).toBe('I ___ football yesterday.')
  })

  it('produces content that the answerability rule now accepts', () => {
    // The round trip is the real assertion: cue it, then confirm the check that
    // flagged it is satisfied.
    const points = [
      point({
        drills: [
          drill(),
          drill({
            acceptedAnswers: ['some information'],
            id: 'd2',
            prompt: 'I need ___ about the course.',
            target: 'some information',
          }),
        ],
      }),
    ]
    const { proposals } = proposeFillBlankCues(points)
    const cued = applyFillBlankCues(points, proposals)

    expect(proposeFillBlankCues(cued).proposals).toEqual([])
  })
})

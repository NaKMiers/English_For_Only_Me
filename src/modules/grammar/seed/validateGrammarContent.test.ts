import { describe, expect, it } from 'vitest'

import type { GrammarContentFile } from '@/modules/grammar/types'

import {
  getRequiredDrillCount,
  requiresVietnameseExplanation,
  validateGrammarContent,
} from './validateGrammarContent'

function taxonomyRow(
  overrides: Partial<GrammarContentFile[number]> = {}
): GrammarContentFile[number] {
  return {
    cefrLevel: 'A2',
    complexity: 2,
    family: 'verb-tenses',
    l1Risk: 'medium',
    order: 1,
    slug: 'present-perfect-simple',
    summary: 'Links a past action to now.',
    title: 'Present Perfect Simple',
    ...overrides,
  }
}

function drill(
  overrides: Partial<
    NonNullable<GrammarContentFile[number]['drills']>[number]
  > = {}
) {
  return {
    acceptedAnswers: ['he has lived here', "he's lived here", 'he has lived'],
    choices: null,
    difficulty: 1 as const,
    explanation: 'Present perfect links past to now.',
    id: 'd1',
    kind: 'transform' as const,
    prompt: 'Rewrite using present perfect.',
    target: 'He has lived here',
    ...overrides,
  }
}

function bodyWith(
  count: number,
  kinds: string[] = ['transform', 'choice', 'fillBlank']
) {
  return Array.from({ length: count }, (_, index) =>
    drill({
      // A choice drill's options must include its target, or no option can be
      // correct. The old fixture used ['a', 'b'] against an unrelated target,
      // which is not a shape real content is allowed to take.
      choices:
        kinds[index % kinds.length] === 'choice'
          ? ['He has lived here', 'He lived here']
          : null,
      id: `d${index + 1}`,
      kind: kinds[index % kinds.length] as 'transform',
    })
  )
}

describe('getRequiredDrillCount', () => {
  it('requires 12 drills for high l1Risk and 8 otherwise', () => {
    expect(getRequiredDrillCount('high')).toBe(12)
    expect(getRequiredDrillCount('medium')).toBe(8)
    expect(getRequiredDrillCount('low')).toBe(8)
  })
})

describe('requiresVietnameseExplanation', () => {
  it('requires Vietnamese for high l1Risk or complexity >= 4', () => {
    expect(
      requiresVietnameseExplanation({ complexity: 1, l1Risk: 'high' })
    ).toBe(true)
    expect(
      requiresVietnameseExplanation({ complexity: 4, l1Risk: 'low' })
    ).toBe(true)
    expect(
      requiresVietnameseExplanation({ complexity: 5, l1Risk: 'low' })
    ).toBe(true)
  })

  it('does not require it for easy low-risk points', () => {
    expect(
      requiresVietnameseExplanation({ complexity: 2, l1Risk: 'low' })
    ).toBe(false)
    expect(
      requiresVietnameseExplanation({ complexity: 3, l1Risk: 'medium' })
    ).toBe(false)
  })
})

describe('validateGrammarContent', () => {
  it('accepts a clean taxonomy-only file', () => {
    const result = validateGrammarContent({ points: [taxonomyRow()] })

    expect(result.ok).toBe(true)
    expect(result.issues).toEqual([])
    expect(result.checkedPoints).toBe(1)
  })

  it('flags duplicate slugs', () => {
    const result = validateGrammarContent({
      points: [taxonomyRow(), taxonomyRow({ order: 2 })],
    })

    expect(result.ok).toBe(false)
    expect(result.issues.map(issue => issue.rule)).toContain('unique-slug')
  })

  it('flags a non-kebab-case slug', () => {
    const result = validateGrammarContent({
      points: [taxonomyRow({ slug: 'Present_Perfect' })],
    })

    expect(result.issues.map(issue => issue.rule)).toContain('slug-format')
  })

  it('flags unknown enum values', () => {
    const result = validateGrammarContent({
      points: [
        taxonomyRow({
          cefrLevel: 'B3' as 'B1',
          complexity: 9 as 1,
          family: 'nonsense' as 'modals',
          l1Risk: 'extreme' as 'high',
        }),
      ],
    })

    expect(result.issues.filter(issue => issue.rule === 'enum')).toHaveLength(4)
  })

  it('flags unresolved prerequisites and contrasts', () => {
    const result = validateGrammarContent({
      points: [
        taxonomyRow({
          contrastsWith: ['does-not-exist'],
          prerequisites: ['also-missing'],
        }),
      ],
    })

    const rules = result.issues.map(issue => issue.rule)

    expect(rules).toContain('prerequisite-resolves')
    expect(rules).toContain('contrast-resolves')
  })

  it('flags a self-referencing contrast', () => {
    const result = validateGrammarContent({
      points: [taxonomyRow({ contrastsWith: ['present-perfect-simple'] })],
    })

    expect(result.issues.map(issue => issue.rule)).toContain('contrast-self')
  })

  it('accepts a merge stub pointing at a live point', () => {
    const result = validateGrammarContent({
      points: [
        taxonomyRow(),
        taxonomyRow({
          mergedInto: 'present-perfect-simple',
          order: 2,
          slug: 'present-perfect-retired',
        }),
      ],
    })

    expect(result.ok).toBe(true)
  })

  it('refuses a merge redirect that chains through another merged point', () => {
    const result = validateGrammarContent({
      points: [
        taxonomyRow(),
        taxonomyRow({
          mergedInto: 'present-perfect-simple',
          order: 2,
          slug: 'stub-one',
        }),
        taxonomyRow({ mergedInto: 'stub-one', order: 3, slug: 'stub-two' }),
      ],
    })

    expect(result.issues.map(issue => issue.rule)).toContain('merge-chain')
  })

  // The rule that turns silent orphaning of learner progress into a loud failure.
  it('fails when a previously-seeded slug vanished without a redirect', () => {
    const result = validateGrammarContent({
      points: [taxonomyRow()],
      previouslySeededSlugs: ['present-perfect-simple', 'past-perfect-simple'],
    })

    expect(result.ok).toBe(false)

    const issue = result.issues.find(
      candidate => candidate.rule === 'no-vanished-slug'
    )

    expect(issue?.slug).toBe('past-perfect-simple')
  })

  it('passes when a previously-seeded slug survives as a merge stub', () => {
    const result = validateGrammarContent({
      points: [
        taxonomyRow(),
        taxonomyRow({
          mergedInto: 'present-perfect-simple',
          order: 2,
          slug: 'past-perfect-simple',
        }),
      ],
      previouslySeededSlugs: ['present-perfect-simple', 'past-perfect-simple'],
    })

    expect(result.ok).toBe(true)
  })

  describe('with a generated body', () => {
    it('accepts a complete body', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: bodyWith(8),
            explanation: 'Use have/has plus past participle.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(result.ok).toBe(true)
    })

    it('enforces 12 drills on a high-l1Risk point', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: bodyWith(8),
            explanation: 'Articles are hard.',
            explanationVi: 'Mao tu rat kho.',
            l1Risk: 'high',
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'drill-minimum'
      )

      expect(issue?.message).toContain('at least 12')
    })

    it('requires explanationVi when l1Risk is high', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: bodyWith(12),
            explanation: 'Articles are hard.',
            l1Risk: 'high',
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(result.issues.map(issue => issue.rule)).toContain(
        'vi-explanation-required'
      )
    })

    it('requires at least 3 distinct drill kinds', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: bodyWith(8, ['transform']),
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(result.issues.map(issue => issue.rule)).toContain(
        'drill-kind-variety'
      )
    })

    /**
     * A single accepted answer is legitimate. There is deliberately no quota -
     * see the note in constants.ts. Requiring more only ever produced invented
     * alternatives, including ungrammatical ones that the grader would then
     * accept.
     */
    it('accepts a production drill with exactly one accepted answer', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [
              ...bodyWith(7),
              drill({
                acceptedAnswers: ['only one'],
                id: 'd8',
                target: 'only one',
              }),
            ],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(
        result.issues.filter(candidate => candidate.rule === 'accepted-answers')
      ).toEqual([])
    })

    it('rejects a sentence listed as both a minimal pair and a mistake', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            commonMistakes: [
              {
                right: 'She stopped smoking.',
                why: 'Gerund means quit entirely.',
                wrong: 'She stopped to smoke.',
              },
            ],
            drills: bodyWith(8),
            explanation: 'Body.',
            minimalPairs: [
              {
                meaning: 'She paused in order to have a cigarette.',
                sentence: 'She stopped to smoke.',
              },
            ],
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'mistake-contradicts-minimal-pair'
      )

      expect(issue?.message).toContain('She stopped to smoke.')
    })

    it('accepts a body with minimal pairs that are not also mistakes', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            commonMistakes: [
              {
                right: 'She stopped smoking.',
                why: 'The bare verb is never correct here.',
                wrong: 'She stopped smoke.',
              },
            ],
            drills: bodyWith(8),
            explanation: 'Body.',
            minimalPairs: [
              {
                meaning: 'She paused in order to have a cigarette.',
                sentence: 'She stopped to smoke.',
              },
            ],
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(result.issues).toEqual([])
    })

    it('rejects a drill whose target is not an accepted answer', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [
              ...bodyWith(7),
              drill({
                acceptedAnswers: ['something else'],
                id: 'd8',
                target: 'the real answer',
              }),
            ],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'accepted-answers'
      )

      expect(issue?.message).toContain('d8')
    })

    it('rejects a choice drill that accepts one of its distractors', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [
              ...bodyWith(7),
              drill({
                acceptedAnswers: ['right', 'wrong'],
                choices: ['right', 'wrong'],
                id: 'd8',
                kind: 'choice',
                target: 'right',
              }),
            ],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'drill-choices'
      )

      expect(issue?.message).toContain('distractor')
    })

    it('rejects a choice drill whose target is not among its choices', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [
              ...bodyWith(7),
              drill({
                acceptedAnswers: ['missing option'],
                choices: ['wrong a', 'wrong b'],
                id: 'd8',
                kind: 'choice',
                target: 'missing option',
              }),
            ],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'drill-choices'
      )

      expect(issue?.message).toContain('not among its choices')
    })

    it('requires choices on a choice drill', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [
              ...bodyWith(7),
              drill({ choices: null, id: 'd8', kind: 'choice' }),
            ],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      expect(result.issues.map(issue => issue.rule)).toContain('drill-choices')
    })

    it('flags duplicate drill ids', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow({
            drills: [...bodyWith(8), drill({ id: 'd1' })],
            explanation: 'Body.',
            reviewStatus: 'unverified',
          }),
        ],
      })

      const issue = result.issues.find(
        candidate => candidate.rule === 'drill-id'
      )

      expect(issue?.message).toContain('Duplicate')
    })

    it('does not require a body on a merge stub', () => {
      const result = validateGrammarContent({
        points: [
          taxonomyRow(),
          taxonomyRow({
            mergedInto: 'present-perfect-simple',
            order: 2,
            slug: 'retired',
          }),
        ],
      })

      expect(result.ok).toBe(true)
    })
  })
})

describe('l1RiskObserved', () => {
  function issuesFor(overrides: Record<string, unknown>) {
    return validateGrammarContent({
      points: [taxonomyRow(overrides as never)],
    }).issues
  }

  it('accepts a valid observed risk', () => {
    expect(issuesFor({ l1RiskObserved: 'high' })).toEqual([])
  })

  it('accepts an absent observed risk', () => {
    // The launch state for all 184 rows. An unjudged row is not an error.
    expect(issuesFor({})).toEqual([])
  })

  it('accepts an explicit null', () => {
    expect(issuesFor({ l1RiskObserved: null })).toEqual([])
  })

  it('rejects a value outside the enum', () => {
    const issues = issuesFor({ l1RiskObserved: 'brutal' })

    expect(issues).toHaveLength(1)
    expect(issues[0].rule).toBe('enum')
    expect(issues[0].message).toContain('l1RiskObserved')
  })

  /**
   * The failure this check exists for: nothing else in the validator rejects
   * unknown fields, so a misspelled key would validate, seed, and be ignored -
   * losing a judgment pass with no symptom anywhere.
   */
  it('rejects a misspelled key', () => {
    const issues = issuesFor({ l1riskObserved: 'high' })

    expect(issues).toHaveLength(1)
    expect(issues[0].rule).toBe('field-name')
    expect(issues[0].message).toContain('l1riskObserved')
  })

  it('rejects other casings of the same misspelling', () => {
    for (const key of ['L1RiskObserved', 'l1RISKobserved', 'l1riskobserved']) {
      const issues = issuesFor({ [key]: 'high' })

      expect(
        issues.map(issue => issue.rule),
        key
      ).toContain('field-name')
    }
  })

  it('does not flag unrelated fields', () => {
    expect(issuesFor({ l1Notes: 'Vietnamese has no articles.' })).toEqual([])
  })
})

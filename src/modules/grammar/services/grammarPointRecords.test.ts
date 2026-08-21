import { describe, expect, it } from 'vitest'

import type { GrammarPointDocument } from '@/models/grammar/GrammarPointModel'

import { toGrammarPointRecord } from './grammarPointRecords'

type LeanGrammarPoint = GrammarPointDocument & { _id: unknown }

const DRILL = {
  acceptedAnswers: ['the durian', 'the durians'],
  choices: null,
  difficulty: 1,
  explanation: 'Specific noun, so `the`.',
  id: 'd1',
  kind: 'fillBlank',
  prompt: 'I ate ___ durian.',
  target: 'the durian',
}

function document(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'abc123',
    cefrLevel: 'A1',
    commonMistakes: [],
    complexity: 5,
    contrastsWith: [],
    drills: [DRILL, { ...DRILL, id: 'd2' }],
    examples: [],
    explanation: 'Use `the` when the noun is identified.',
    explanationVi: null,
    family: 'articles-determiners',
    formPatterns: [],
    ieltsImpactOverride: null,
    l1Notes: null,
    l1Risk: 'high',
    l1RiskObserved: null,
    mergedInto: null,
    minimalPairs: [],
    order: 1,
    prerequisites: [],
    reviewStatus: 'unverified',
    reviewedAt: null,
    slug: 'definite-article-the',
    summary: 'Shared or previously mentioned reference.',
    title: 'Definite Article The',
    ...overrides,
  } as unknown as LeanGrammarPoint
}

/**
 * MANDATORY regression guard for the module's central guarantee, stated at
 * `GrammarRecallModal.tsx:56`: the client never learns the answer before
 * submitting.
 *
 * This mapper is the boundary. Every lesson page, every browse row and every
 * API response for all 184 points goes through it, and the Mongo document it
 * receives contains `target` and `acceptedAnswers` for every drill. Widening it
 * to pass `drills` through - which is the obvious way to recover a drill prompt
 * for the Error Archive - would leak the entire answer key with NO visible
 * symptom: the grader keeps working, the pages keep rendering, and every other
 * test keeps passing.
 */
describe('toGrammarPointRecord answer safety', () => {
  it('reports a drill count and no drills', () => {
    const record = toGrammarPointRecord(document())

    expect(record.drillCount).toBe(2)
    expect(record).not.toHaveProperty('drills')
  })

  it('carries no target and no accepted answers anywhere in the payload', () => {
    const serialised = JSON.stringify(toGrammarPointRecord(document()))

    expect(serialised).not.toContain('acceptedAnswers')
    expect(serialised).not.toContain('target')
    expect(serialised).not.toContain('the durian')
  })

  it('carries no drill prompts either', () => {
    // Prompts are safe to show, but only where a learner has earned them: the
    // recall task and the Error Archive serve them deliberately. Leaking every
    // prompt on the lesson page would spoil the drills instead of the answers.
    expect(JSON.stringify(toGrammarPointRecord(document()))).not.toContain(
      'I ate ___ durian.'
    )
  })

  it('holds the guarantee for a point with no drills', () => {
    const record = toGrammarPointRecord(document({ drills: [] }))

    expect(record.drillCount).toBe(0)
    expect(record).not.toHaveProperty('drills')
  })

  it('exposes the observed risk so presentation can read it', () => {
    expect(
      toGrammarPointRecord(document({ l1RiskObserved: 'high' })).l1RiskObserved
    ).toBe('high')
    expect(toGrammarPointRecord(document()).l1RiskObserved).toBeNull()
  })
})

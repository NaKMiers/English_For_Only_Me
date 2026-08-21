import { describe, expect, it } from 'vitest'

import type { GrammarLessonApiRecord } from '@/modules/grammar/types'

import { compilePanelScript } from './compilePanelScript'
import type { LearnerPresentationState } from './types'

function lesson(
  overrides: Partial<GrammarLessonApiRecord> = {}
): GrammarLessonApiRecord {
  return {
    cefrLevel: 'A1',
    commonMistakes: [],
    complexity: 5,
    contrasts: [],
    contrastsWith: [],
    drillCount: 0,
    examples: [],
    explanation: null,
    explanationVi: null,
    family: 'articles-determiners',
    formPatterns: [],
    id: 'id-1',
    ieltsImpact: 'high',
    l1Notes: null,
    l1Risk: 'high',
    minimalPairs: [],
    order: 1,
    prerequisites: [],
    reviewStatus: 'unverified',
    reviewedAt: null,
    slug: 'definite-article-the',
    summary: 'English marks definiteness; Vietnamese does not.',
    title: 'The Definite Article',
    ...overrides,
  }
}

function learner(
  overrides: Partial<LearnerPresentationState> = {}
): LearnerPresentationState {
  return {
    actorId: 'actor-1',
    correctAnswerStreak: 0,
    correctCount: 0,
    lastReviewedAt: null,
    recallStage: null,
    recentOutcome: null,
    reviewCount: 0,
    revivalCount: 0,
    scar: null,
    status: null,
    wrongCount: 0,
    ...overrides,
  }
}

function kinds(beats: { kind: string }[]) {
  return beats.map(beat => beat.kind)
}

const FULL_LESSON = lesson({
  commonMistakes: [{ right: 'the durian', why: 'Specific.', wrong: 'durian' }],
  drillCount: 12,
  examples: [{ en: 'I ate the durian.', note: null, vi: null }],
  explanation: 'Use `the` when the noun is already identified.',
  explanationVi: 'Dung `the` khi danh tu da xac dinh.',
  formPatterns: ['the + noun'],
  l1Notes: 'Vietnamese has no articles.',
  minimalPairs: [{ meaning: 'A specific one.', sentence: 'I ate the durian.' }],
})

describe('compilePanelScript', () => {
  it('emits every beat in order for a complete point', () => {
    const beats = compilePanelScript({
      learnerState: learner({
        scar: {
          conquered: null,
          firstWrong: {
            at: '2026-08-01T00:00:00.000Z',
            matchedAnswer: null,
            prompt: 'I ate ___ durian.',
            userAnswer: 'a durian',
          },
          revivals: 0,
          worstTrap: null,
        },
      }),
      lesson: FULL_LESSON,
      verdictLine: 'Sit down.',
    })

    expect(kinds(beats)).toEqual([
      'hook',
      'interference',
      'rule',
      'proof',
      'pair',
      'trap',
      'scar',
      'boss',
      'verdict',
    ])
  })

  /**
   * The failure the old page had: nine titled panels regardless of content, so
   * a thin point rendered as a page of empty frames. An absent beat collapses.
   */
  it('emits only the hook for a point with nothing written yet', () => {
    const beats = compilePanelScript({
      learnerState: learner({ actorId: null }),
      lesson: lesson(),
      verdictLine: null,
    })

    expect(kinds(beats)).toEqual(['hook'])
  })

  it('never emits an empty beat', () => {
    const beats = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({
        commonMistakes: [],
        examples: [],
        formPatterns: [],
        minimalPairs: [],
      }),
      verdictLine: null,
    })

    expect(kinds(beats)).not.toContain('proof')
    expect(kinds(beats)).not.toContain('pair')
    expect(kinds(beats)).not.toContain('trap')
  })

  it('keeps the rule beat when a point has an explanation but no patterns', () => {
    const beats = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({ explanation: 'Some rule.' }),
      verdictLine: null,
    })

    expect(kinds(beats)).toContain('rule')
  })

  it('emits interference from either l1Notes or a Vietnamese explanation', () => {
    const fromNotes = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({ l1Notes: 'Vietnamese has no articles.' }),
      verdictLine: null,
    })
    const fromVi = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({ explanationVi: 'Giai thich.' }),
      verdictLine: null,
    })

    expect(kinds(fromNotes)).toContain('interference')
    expect(kinds(fromVi)).toContain('interference')
  })

  describe('signed out', () => {
    /**
     * The first-impression path, and the one with the least data. It has to
     * render completely, which means content beats and no learner beats.
     */
    it('emits content beats and no learner beats', () => {
      const beats = compilePanelScript({
        learnerState: learner({ actorId: null }),
        lesson: FULL_LESSON,
        verdictLine: 'Sit down.',
      })

      expect(kinds(beats)).toEqual([
        'hook',
        'interference',
        'rule',
        'proof',
        'pair',
        'trap',
        'boss',
      ])
    })

    it('reports no wrong answers on the hook even if state carries some', () => {
      // A signed-out visitor's page must not quote a count from whoever was
      // signed in a moment ago.
      const [hook] = compilePanelScript({
        learnerState: learner({ actorId: null, wrongCount: 11 }),
        lesson: FULL_LESSON,
        verdictLine: null,
      })

      expect(hook).toMatchObject({ kind: 'hook', wrongCount: 0 })
    })

    it('drops the scar beat even when a scar is somehow present', () => {
      const beats = compilePanelScript({
        learnerState: learner({
          actorId: null,
          scar: {
            conquered: null,
            firstWrong: null,
            revivals: 3,
            worstTrap: {
              occurrences: 4,
              prompt: null,
              userAnswer: 'a durian',
            },
          },
        }),
        lesson: FULL_LESSON,
        verdictLine: null,
      })

      expect(kinds(beats)).not.toContain('scar')
    })
  })

  describe('the scar beat', () => {
    // The Archive lands after the gate. Turning it on must not change the
    // compiler's shape, so both states are covered from the start.
    it('is absent while the archive has nothing', () => {
      const beats = compilePanelScript({
        learnerState: learner({ scar: null }),
        lesson: FULL_LESSON,
        verdictLine: null,
      })

      expect(kinds(beats)).not.toContain('scar')
    })

    it('sits between the trap and the boss once present', () => {
      const beats = compilePanelScript({
        learnerState: learner({
          scar: {
            conquered: null,
            firstWrong: null,
            revivals: 1,
            worstTrap: null,
          },
        }),
        lesson: FULL_LESSON,
        verdictLine: null,
      })
      const order = kinds(beats)

      expect(order.indexOf('scar')).toBeGreaterThan(order.indexOf('trap'))
      expect(order.indexOf('scar')).toBeLessThan(order.indexOf('boss'))
    })
  })

  it('reads the effective risk on the hook, not the authored one', () => {
    // The danger the learner is warned about should be the danger they told the
    // module about.
    const [hook] = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({ l1Risk: 'low', l1RiskObserved: 'high' }),
      verdictLine: null,
    })

    expect(hook).toMatchObject({ kind: 'hook', l1Risk: 'high' })
  })

  it('drops the boss beat when the point has no drills', () => {
    const beats = compilePanelScript({
      learnerState: learner(),
      lesson: lesson({ drillCount: 0, explanation: 'Some rule.' }),
      verdictLine: null,
    })

    expect(kinds(beats)).not.toContain('boss')
  })

  it('drops the verdict when no line was selected', () => {
    const beats = compilePanelScript({
      learnerState: learner(),
      lesson: FULL_LESSON,
      verdictLine: null,
    })

    expect(kinds(beats)).not.toContain('verdict')
  })

  /** Answers must never reach a beat: beats are rendered into the page. */
  it('carries no answer-bearing fields', () => {
    const serialised = JSON.stringify(
      compilePanelScript({
        learnerState: learner(),
        lesson: FULL_LESSON,
        verdictLine: 'Sit down.',
      })
    )

    expect(serialised).not.toContain('acceptedAnswers')
    expect(serialised).not.toContain('"target"')
  })
})

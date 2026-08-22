import { describe, expect, it } from 'vitest'

import {
  describeStudySummary,
  resolveStudyStatus,
  summariseStudyStatuses,
  STUDY_PIP_COUNT,
} from './resolveStudyStatus'

const NOW = new Date('2026-08-22T12:00:00.000Z')
const YESTERDAY = new Date('2026-08-21T12:00:00.000Z')
const TOMORROW = new Date('2026-08-23T12:00:00.000Z')

function item(overrides: Record<string, unknown> = {}) {
  return {
    dueAt: TOMORROW,
    recallStage: 3,
    status: 'learning' as const,
    ...overrides,
  }
}

describe('resolveStudyStatus', () => {
  it('reports a point with no row as not started', () => {
    const status = resolveStudyStatus({ item: null, now: NOW })

    expect(status).toMatchObject({
      filledPips: 0,
      isDue: false,
      kind: 'notStarted',
      label: 'Not started',
      showPips: true,
      stage: null,
    })
  })

  it('fills one pip per ladder rung', () => {
    for (const stage of [1, 2, 3, 4, 5, 6, 7])
      expect(
        resolveStudyStatus({ item: item({ recallStage: stage }), now: NOW })
          .filledPips
      ).toBe(stage)
  })

  it('names the stage in the label, matching the lesson page wording', () => {
    expect(
      resolveStudyStatus({ item: item({ recallStage: 3 }), now: NOW }).label
    ).toBe('Learning - stage 3/7')
  })

  describe('due', () => {
    it('is due when the date has passed', () => {
      const status = resolveStudyStatus({
        item: item({ dueAt: YESTERDAY }),
        now: NOW,
      })

      expect(status.isDue).toBe(true)
      expect(status.label).toBe('Learning - stage 3/7, due now')
    })

    it('is due at exactly the due moment', () => {
      expect(
        resolveStudyStatus({ item: item({ dueAt: NOW }), now: NOW }).isDue
      ).toBe(true)
    })

    it('is not due when the date is ahead', () => {
      expect(
        resolveStudyStatus({ item: item({ dueAt: TOMORROW }), now: NOW }).isDue
      ).toBe(false)
    })

    it('accepts an ISO string, which is what the API sends', () => {
      expect(
        resolveStudyStatus({
          item: item({ dueAt: YESTERDAY.toISOString() }),
          now: NOW,
        }).isDue
      ).toBe(true)
    })

    it('says so when a learning point has no schedule at all', () => {
      expect(
        resolveStudyStatus({ item: item({ dueAt: null }), now: NOW }).label
      ).toBe('Learning - stage 3/7 (not scheduled)')
    })
  })

  it('shows a mastered point as a full bar', () => {
    const status = resolveStudyStatus({
      item: item({ dueAt: null, recallStage: 7, status: 'mastered' }),
      now: NOW,
    })

    expect(status).toMatchObject({
      filledPips: STUDY_PIP_COUNT,
      isDue: false,
      kind: 'mastered',
      label: 'Mastered',
      showPips: true,
    })
  })

  /**
   * "I already know this" and "skip this for now" are both the learner saying
   * stop scheduling it, and they used to draw the same nothing. They are not the
   * same claim, so they no longer look the same.
   */
  describe('already known', () => {
    const resolved = resolveStudyStatus({
      item: item({ status: 'alreadyKnow' }),
      now: NOW,
    })

    it("draws a full bar, because the rule is off the learner's plate", () => {
      expect(resolved.showPips).toBe(true)
      expect(resolved.filledPips).toBe(STUDY_PIP_COUNT)
      expect(resolved.label).toBe('Marked as already known')
    })

    /**
     * The full bar is only honest because the colour separates it from mastery.
     * `kind` is what the strip switches on, so this is the assertion that keeps
     * a declared rule from being drawn as seven answered reviews.
     */
    it('stays distinguishable from mastered', () => {
      const mastered = resolveStudyStatus({
        item: item({ status: 'mastered' }),
        now: NOW,
      })

      expect(resolved.filledPips).toBe(mastered.filledPips)
      expect(resolved.kind).not.toBe(mastered.kind)
    })

    it('reports no stage, since the learner never climbed one', () => {
      // A full bar is not seven rungs. Anything reading `stage` as progress has
      // to get null here.
      expect(resolved.stage).toBeNull()
    })

    it('is never due, even if a stale date says otherwise', () => {
      expect(
        resolveStudyStatus({
          item: item({ dueAt: YESTERDAY, status: 'alreadyKnow' }),
          now: NOW,
        }).isDue
      ).toBe(false)
    })
  })

  describe('skipped points draw no bar', () => {
    // An empty bar here would be indistinguishable from never having started,
    // which is the opposite of what happened.
    it('shows a rule instead of a ladder', () => {
      const resolved = resolveStudyStatus({
        item: item({ status: 'ignored' }),
        now: NOW,
      })

      expect(resolved.showPips).toBe(false)
      expect(resolved.label).toBe('Skipped for now')
      expect(resolved.stage).toBeNull()
    })

    it('is never due, even if a stale date says otherwise', () => {
      expect(
        resolveStudyStatus({
          item: item({ dueAt: YESTERDAY, status: 'ignored' }),
          now: NOW,
        }).isDue
      ).toBe(false)
    })
  })

  describe('defends against out-of-range stages', () => {
    it('clamps above the top rung', () => {
      expect(
        resolveStudyStatus({ item: item({ recallStage: 99 }), now: NOW })
          .filledPips
      ).toBe(STUDY_PIP_COUNT)
    })

    it('clamps below zero', () => {
      // Stage 0 is legal on an attempt row (no ladder position); a negative one
      // is not, and a negative pip count would break the render.
      expect(
        resolveStudyStatus({ item: item({ recallStage: -3 }), now: NOW })
          .filledPips
      ).toBe(0)
    })
  })
})

describe('summariseStudyStatuses', () => {
  const statuses = [
    resolveStudyStatus({ item: null, now: NOW }),
    resolveStudyStatus({ item: null, now: NOW }),
    resolveStudyStatus({ item: item({ dueAt: YESTERDAY }), now: NOW }),
    resolveStudyStatus({ item: item({ dueAt: TOMORROW }), now: NOW }),
    resolveStudyStatus({ item: item({ status: 'mastered' }), now: NOW }),
    resolveStudyStatus({ item: item({ status: 'ignored' }), now: NOW }),
  ]

  it('counts each state', () => {
    expect(summariseStudyStatuses(statuses)).toEqual({
      alreadyKnow: 0,
      due: 1,
      ignored: 1,
      learning: 2,
      mastered: 1,
      notStarted: 2,
      total: 6,
    })
  })

  it('counts a due point as learning as well, since it is both', () => {
    const summary = summariseStudyStatuses(statuses)

    expect(summary.learning).toBe(2)
    expect(summary.due).toBe(1)
  })

  it('handles an empty result', () => {
    expect(summariseStudyStatuses([])).toMatchObject({ total: 0 })
  })
})

describe('describeStudySummary', () => {
  it('names only the buckets that have something in them', () => {
    expect(
      describeStudySummary({
        alreadyKnow: 0,
        due: 3,
        ignored: 0,
        learning: 8,
        mastered: 0,
        notStarted: 12,
        total: 20,
      })
    ).toBe('3 due now, 8 learning, 12 not started')
  })

  it('says something honest when nothing is tracked', () => {
    expect(
      describeStudySummary({
        alreadyKnow: 0,
        due: 0,
        ignored: 0,
        learning: 0,
        mastered: 0,
        notStarted: 0,
        total: 0,
      })
    ).toBe('nothing tracked yet')
  })

  it('leads with due, because that is the actionable number', () => {
    expect(
      describeStudySummary({
        alreadyKnow: 1,
        due: 2,
        ignored: 1,
        learning: 3,
        mastered: 4,
        notStarted: 5,
        total: 16,
      })
    ).toBe(
      '2 due now, 3 learning, 4 mastered, 5 not started, 1 already known, 1 skipped'
    )
  })
})

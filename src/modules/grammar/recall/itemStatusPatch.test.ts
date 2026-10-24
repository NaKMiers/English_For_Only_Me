import { describe, expect, it } from 'vitest'

import type { UserGrammarItemApiRecord } from '@/modules/grammar/types'

import { getItemStatusPatch, predictGrammarItemStatus } from './itemStatusPatch'

const NOW = new Date('2026-10-24T08:00:00.000Z')

const EXISTING: UserGrammarItemApiRecord = {
  correctCount: 4,
  dueAt: '2026-10-30T08:00:00.000Z',
  lastReviewedAt: '2026-10-20T08:00:00.000Z',
  masteredAt: null,
  pointSlug: 'present-perfect',
  recallStage: 4,
  reviewCount: 6,
  status: 'learning',
  wrongCount: 2,
}

/** What the upsert writes: model defaults, then `$set` of the patch. */
function serverRow(
  previous: UserGrammarItemApiRecord | null,
  status: Parameters<typeof getItemStatusPatch>[0]['status']
) {
  const defaults = {
    correctCount: 0,
    dueAt: null as Date | null,
    lastReviewedAt: null as Date | null,
    masteredAt: null as Date | null,
    pointSlug: 'present-perfect',
    recallStage: 1,
    reviewCount: 0,
    status: 'learning',
    wrongCount: 0,
  }
  const start = previous
    ? {
        ...previous,
        dueAt: previous.dueAt ? new Date(previous.dueAt) : null,
        lastReviewedAt: previous.lastReviewedAt
          ? new Date(previous.lastReviewedAt)
          : null,
        masteredAt: previous.masteredAt ? new Date(previous.masteredAt) : null,
      }
    : defaults
  const row = { ...start, ...getItemStatusPatch({ now: NOW, status }) }

  return {
    correctCount: row.correctCount,
    dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    lastReviewedAt: row.lastReviewedAt
      ? row.lastReviewedAt.toISOString()
      : null,
    masteredAt: row.masteredAt ? row.masteredAt.toISOString() : null,
    pointSlug: row.pointSlug,
    recallStage: row.recallStage,
    reviewCount: row.reviewCount,
    status: row.status,
    wrongCount: row.wrongCount,
  }
}

describe('predictGrammarItemStatus', () => {
  it.each([
    ['learning', null],
    ['alreadyKnow', null],
    ['ignored', null],
    ['learning', EXISTING],
    ['alreadyKnow', EXISTING],
    ['ignored', EXISTING],
    ['mastered', EXISTING],
  ] as const)('predicts the upserted row for %s', (status, previous) => {
    expect(
      predictGrammarItemStatus({
        item: previous,
        now: NOW,
        pointSlug: 'present-perfect',
        status,
      })
    ).toEqual(serverRow(previous, status))
  })

  it('puts a started point at stage 1, due now', () => {
    const next = predictGrammarItemStatus({
      item: EXISTING,
      now: NOW,
      pointSlug: 'present-perfect',
      status: 'learning',
    })

    expect(next).toMatchObject({
      dueAt: NOW.toISOString(),
      recallStage: 1,
      status: 'learning',
    })
  })

  it('is a set, not a toggle: applying the same status twice is stable', () => {
    const once = predictGrammarItemStatus({
      item: EXISTING,
      now: NOW,
      pointSlug: 'present-perfect',
      status: 'alreadyKnow',
    })
    const twice = predictGrammarItemStatus({
      item: once,
      now: NOW,
      pointSlug: 'present-perfect',
      status: 'alreadyKnow',
    })

    expect(twice).toEqual(once)
  })
})

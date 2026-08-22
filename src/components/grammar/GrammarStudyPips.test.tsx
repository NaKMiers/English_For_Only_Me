import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  resolveStudyStatus,
  STUDY_PIP_COUNT,
} from '@/modules/grammar/presentation/resolveStudyStatus'
import type { GrammarUserItemStatus } from '@/modules/grammar/types'

import { GrammarStudyPips } from './GrammarStudyPips'

const NOW = new Date('2026-08-22T12:00:00.000Z')
const YESTERDAY = new Date('2026-08-21T12:00:00.000Z')
const TOMORROW = new Date('2026-08-23T12:00:00.000Z')

// The stored statuses, not the resolved kinds: there is no `notStarted` row,
// which is exactly why `null` is a case of its own below.
function strip(
  item: {
    dueAt: Date | null
    recallStage: number
    status: GrammarUserItemStatus
  } | null
) {
  return renderToStaticMarkup(
    <GrammarStudyPips status={resolveStudyStatus({ item, now: NOW })} />
  )
}

function learning(
  overrides: { dueAt?: Date | null; recallStage?: number } = {}
) {
  return {
    dueAt: TOMORROW,
    recallStage: 3,
    status: 'learning' as const,
    ...overrides,
  }
}

/**
 * The strip has no text, so its classes ARE its meaning: there is nothing else
 * a sighted learner reads. These assertions are on the rendered markup for that
 * reason - a status object can be right while the colour on screen is wrong.
 */
describe('GrammarStudyPips', () => {
  it('draws one segment per rung of the ladder', () => {
    expect(strip(learning()).match(/flex-1/g)).toHaveLength(STUDY_PIP_COUNT)
  })

  it('fills only as far as the learner has climbed', () => {
    const html = strip(learning({ recallStage: 3 }))

    expect(html.match(/bg-comic-ink/g)).toHaveLength(3)
    expect(html.match(/bg-transparent/g)).toHaveLength(STUDY_PIP_COUNT - 3)
  })

  it('spans the full width, so it reads as the card edge', () => {
    // The layout decision, pinned: a strip that stopped short would sit inside
    // the row again and take width away from the title.
    expect(strip(learning())).toContain('w-full')
  })

  describe('colour', () => {
    it('turns the filled part red when a review is due', () => {
      const html = strip(learning({ dueAt: YESTERDAY }))

      expect(html).toContain('bg-comic-danger')
      expect(html).not.toContain('bg-comic-ink')
    })

    it('turns a rule the learner already knows green', () => {
      const html = strip({
        dueAt: null,
        recallStage: 0,
        status: 'alreadyKnow',
      })

      expect(html.match(/bg-comic-known/g)).toHaveLength(STUDY_PIP_COUNT)
      expect(html).not.toContain('bg-transparent')
    })

    /**
     * The whole reason "already known" is allowed to draw a full bar. Both are
     * seven filled segments; only the colour says one was earned and one was
     * declared, so if these two ever render alike the bar starts lying.
     */
    it('never draws already-known the same as mastered', () => {
      const known = strip({
        dueAt: null,
        recallStage: 0,
        status: 'alreadyKnow',
      })
      const mastered = strip({
        dueAt: null,
        recallStage: 7,
        status: 'mastered',
      })

      expect(known).not.toBe(mastered)
      expect(mastered).toContain('bg-comic-ink')
      expect(mastered).not.toContain('bg-comic-known')
    })
  })

  it('draws a dashed rule for a skipped rule, not an empty ladder', () => {
    const html = strip({ dueAt: null, recallStage: 0, status: 'ignored' })

    expect(html).toContain('border-dashed')
    expect(html).not.toContain('flex-1')
  })

  it('draws an empty ladder for a rule never started', () => {
    // The state a dashed rule would otherwise be confused with.
    const html = strip(null)

    expect(html.match(/bg-transparent/g)).toHaveLength(STUDY_PIP_COUNT)
    expect(html).not.toContain('border-dashed')
  })

  it('hides itself from screen readers, since the leaf carries the words', () => {
    expect(strip(learning())).toContain('aria-hidden="true"')
    expect(strip({ dueAt: null, recallStage: 0, status: 'ignored' })).toContain(
      'aria-hidden="true"'
    )
  })
})

import { RECALL_MASTERY_STAGE } from '@/modules/learning/recall/recallLadder'

import type { GrammarUserItemStatus } from '../types'

export type StudyStatusKind =
  'alreadyKnow' | 'ignored' | 'learning' | 'mastered' | 'notStarted'

export interface StudyStatus {
  /** Rungs of the ladder to draw filled, 0 to 7. */
  filledPips: number
  /** Waiting for the learner right now. */
  isDue: boolean
  kind: StudyStatusKind
  /**
   * The same wording the lesson page uses, so a rule does not describe itself
   * two different ways on two screens.
   */
  label: string
  /**
   * False where a ladder position would be a lie: a point the learner skipped
   * has no progress to show, and drawing an empty bar next to it would read as
   * "not started" when in fact it was a decision.
   */
  showPips: boolean
  stage: number | null
}

/** Total rungs, so the bar length and the label cannot disagree. */
export const STUDY_PIP_COUNT = RECALL_MASTERY_STAGE

/**
 * Turn one learner item into something drawable beside a rule.
 *
 * The five states already exist and already have words on the lesson page
 * (`GrammarPointActions`); this is the same information sized for a list of 184.
 *
 * ```
 *   no item row     ->  0/7     "Not started"
 *   learning        ->  N/7     "Learning - stage N/7"      (+ due now)
 *   mastered        ->  7/7     "Mastered"
 *   alreadyKnow     ->  7/7     "Marked as already known"   (green, see below)
 *   ignored         ->  no bar  "Skipped for now"
 * ```
 *
 * `alreadyKnow` draws a FULL bar even though the learner never climbed the
 * ladder, because the bar answers "is this rule off your plate", and by the
 * learner's own declaration it is. What keeps it honest is the colour: green is
 * the only state on this map the learner asserts rather than earns, so it can
 * never be misread as seven answered reviews.
 *
 * `ignored` draws no bar at all. "Skip this for now" is not a claim about
 * knowing the rule, and an empty bar there would be indistinguishable from
 * never having started - which is why it gets a dashed rule instead.
 *
 * Pure, so every state is testable without a database or a clock.
 */
export function resolveStudyStatus({
  item,
  now = new Date(),
}: {
  item: {
    dueAt: Date | string | null
    recallStage: number
    status: GrammarUserItemStatus
  } | null
  now?: Date
}): StudyStatus {
  if (!item)
    return {
      filledPips: 0,
      isDue: false,
      kind: 'notStarted',
      label: 'Not started',
      showPips: true,
      stage: null,
    }

  if (item.status === 'mastered')
    return {
      filledPips: STUDY_PIP_COUNT,
      isDue: false,
      kind: 'mastered',
      label: 'Mastered',
      showPips: true,
      stage: STUDY_PIP_COUNT,
    }

  if (item.status === 'alreadyKnow')
    return {
      filledPips: STUDY_PIP_COUNT,
      isDue: false,
      kind: 'alreadyKnow',
      label: 'Marked as already known',
      showPips: true,
      // Null, not 7: the bar is full but there is no rung under it, and a stage
      // number here would let a caller report progress the learner never made.
      stage: null,
    }

  if (item.status === 'ignored')
    return {
      filledPips: 0,
      isDue: false,
      kind: 'ignored',
      label: 'Skipped for now',
      showPips: false,
      stage: null,
    }

  const stage = Math.min(
    STUDY_PIP_COUNT,
    Math.max(0, Math.round(item.recallStage))
  )
  const dueAt = item.dueAt ? new Date(item.dueAt) : null
  const isDue = Boolean(dueAt && dueAt.getTime() <= now.getTime())

  return {
    filledPips: stage,
    isDue,
    kind: 'learning',
    label: `Learning - stage ${stage}/${STUDY_PIP_COUNT}${
      isDue ? ', due now' : dueAt ? '' : ' (not scheduled)'
    }`,
    showPips: true,
    stage,
  }
}

export interface StudySummary {
  alreadyKnow: number
  due: number
  ignored: number
  learning: number
  mastered: number
  notStarted: number
  total: number
}

/**
 * Count the states across whatever the filters are currently showing.
 *
 * Scoped to the visible result on purpose. A total that ignored the filters
 * would contradict the tree directly underneath it - "90 not started" above a
 * page showing 42 rules is a puzzle, not a summary.
 */
export function summariseStudyStatuses(statuses: StudyStatus[]): StudySummary {
  return {
    alreadyKnow: statuses.filter(entry => entry.kind === 'alreadyKnow').length,
    due: statuses.filter(entry => entry.isDue).length,
    ignored: statuses.filter(entry => entry.kind === 'ignored').length,
    learning: statuses.filter(entry => entry.kind === 'learning').length,
    mastered: statuses.filter(entry => entry.kind === 'mastered').length,
    notStarted: statuses.filter(entry => entry.kind === 'notStarted').length,
    total: statuses.length,
  }
}

/**
 * The summary as one sentence, with empty buckets left out.
 *
 * Naming every bucket including the zeroes reads as a form; naming only what is
 * there reads as a status.
 */
export function describeStudySummary(summary: StudySummary): string {
  const parts = [
    summary.due > 0 ? `${summary.due} due now` : null,
    summary.learning > 0 ? `${summary.learning} learning` : null,
    summary.mastered > 0 ? `${summary.mastered} mastered` : null,
    summary.notStarted > 0 ? `${summary.notStarted} not started` : null,
    summary.alreadyKnow > 0 ? `${summary.alreadyKnow} already known` : null,
    summary.ignored > 0 ? `${summary.ignored} skipped` : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : 'nothing tracked yet'
}

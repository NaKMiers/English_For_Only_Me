import { effectiveL1Risk } from '@/modules/grammar/taxonomy/effectiveL1Risk'
import type { GrammarLessonApiRecord } from '@/modules/grammar/types'

import type { Beat, LearnerPresentationState } from './types'

/**
 * Turn one grammar point plus what is known about the learner into an ordered
 * list of comic beats.
 *
 * This is the whole reason v2 is not just a restyle. The old lesson page mapped
 * one data field to one titled panel, so every point rendered nine panels
 * whether or not it had nine things to say - a page shaped by the schema rather
 * than by the lesson. A beat has a JOB: state the uncomfortable truth, show why
 * you specifically fail, change what you can do next, expose a real mistake.
 * A beat with no content to do its job is not emitted, so a thin point renders
 * as a short page rather than as a page full of empty frames.
 *
 * Pure, and the only place that decides what appears. `PanelScriptRenderer`
 * makes no decisions at all - which is what makes the whole layout testable
 * without rendering anything.
 *
 * Ordering is fixed in v1. Reordering by learner state (lead with `scar` when
 * `wrongCount` is high, lead with `hook` when untouched) needs a feel for the
 * pacing first, so it is deliberately deferred rather than guessed at.
 */
export function compilePanelScript({
  learnerState,
  lesson,
  verdictLine,
}: {
  learnerState: LearnerPresentationState
  lesson: GrammarLessonApiRecord
  /**
   * Chosen by `selectSenseiLine`. Passed in rather than computed here so the
   * compiler stays a pure shape function and the line table stays swappable.
   */
  verdictLine: string | null
}): Beat[] {
  const beats: Beat[] = []
  const isSignedIn = learnerState.actorId != null

  // The hook is never optional. Even a point with no body has a level, a
  // difficulty and a risk, and stating them plainly is the opening line.
  beats.push({
    cefrLevel: lesson.cefrLevel,
    complexity: lesson.complexity,
    kind: 'hook',
    l1Risk: effectiveL1Risk(lesson),
    summary: lesson.summary,
    title: lesson.title,
    wrongCount: isSignedIn ? learnerState.wrongCount : 0,
  })

  if (lesson.l1Notes || lesson.explanationVi)
    beats.push({
      explanationVi: lesson.explanationVi,
      kind: 'interference',
      l1Notes: lesson.l1Notes,
    })

  // The rule beat carries `formPatterns` rather than giving them their own
  // panel: a pattern with no rule beside it is a formula to memorise, which is
  // the failure mode this module exists to avoid.
  if (lesson.explanation)
    beats.push({
      explanation: lesson.explanation,
      formPatterns: lesson.formPatterns,
      kind: 'rule',
    })

  if (lesson.examples.length > 0)
    beats.push({ examples: lesson.examples, kind: 'proof' })

  if (lesson.minimalPairs.length > 0)
    beats.push({ kind: 'pair', pairs: lesson.minimalPairs })

  if (lesson.commonMistakes.length > 0)
    beats.push({ kind: 'trap', mistakes: lesson.commonMistakes })

  // Declared from the start, emitted only once the Error Archive fills it in.
  // Turning the Archive on later must not change this function's shape.
  if (isSignedIn && learnerState.scar)
    beats.push({ kind: 'scar', scar: learnerState.scar })

  if (lesson.drillCount > 0)
    beats.push({
      drillCount: lesson.drillCount,
      kind: 'boss',
      recallStage: learnerState.recallStage,
      slug: lesson.slug,
    })

  // No verdict for a signed-out visitor. The sensei reacting to a learner who
  // has done nothing yet would be reacting to nothing.
  if (isSignedIn && verdictLine)
    beats.push({ kind: 'verdict', line: verdictLine })

  return beats
}

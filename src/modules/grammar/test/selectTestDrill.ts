import { selectDrillForStage } from '@/modules/grammar/recall/selectDrillForStage'
import type { GrammarDrillRecord } from '@/modules/grammar/types'

/**
 * Pick a reviewed drill for a test question when no generated one is ready.
 *
 * Never the drill recall serves for this point at the learner's current stage:
 * the due queue ships that drill WITH its accepted answers (the browser grades
 * recall instantly), so reusing it here would hand the learner the test's
 * answers in a network tab. Drills served at earlier stages also went out with
 * their answers, but the learner has already seen those answers in the recall
 * feedback, so they are not secret. Among the other reviewed drills the choice
 * is deterministic, through a distinct salt so it does not just track the
 * recall rotation.
 *
 * Null when the point has no other reviewed drill. The caller already prefers
 * generated questions, so a single-drill point is skipped rather than served
 * with its answers exposed.
 */
export function selectTestDrill({
  drills,
  pointSlug,
  stage,
}: {
  drills: GrammarDrillRecord[]
  pointSlug: string
  stage: number
}): GrammarDrillRecord | null {
  const recallDrill = selectDrillForStage({ drills, pointSlug, stage })

  if (!recallDrill) return null

  return selectDrillForStage({
    drills: drills.filter(drill => drill.id !== recallDrill.id),
    pointSlug: `${pointSlug}:test`,
    stage,
  })
}

/**
 * Vocabulary's recall scheduler now delegates to the shared learning ladder.
 *
 * This file used to hold its own copy of the 7-stage logic. Grammar became the
 * second module needing the same ladder, and an approved 2026-07-12 design
 * ("Module Learning Spine") had already called for a shared layer and then never
 * shipped - which is how vocabulary and dictation both ended up computing their
 * own streaks. Rather than let grammar become a third copy, the logic moved to
 * `src/modules/learning/recall/recallLadder.ts` and this module re-exports it.
 *
 * The swap is behaviour-preserving by construction: the shared ladder's
 * `difficulty` parameter defaults to `medium`, whose interval multiplier is
 * exactly 1, so every interval vocabulary schedules is byte-identical to before.
 * `recallScheduler.test.ts` is unchanged and is the proof.
 *
 * Grammar passes a real difficulty (derived from `l1Risk`) to get tighter
 * spacing on the points a Vietnamese speaker actually keeps failing. Vocabulary
 * can adopt that later by passing its own signal; it does not have to.
 */
export {
  applyRecallAnswer,
  getAlreadyKnownState,
  getInitialRecallState as getInitialLearningState,
} from '@/modules/learning/recall/recallLadder'

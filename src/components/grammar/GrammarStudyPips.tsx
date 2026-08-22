import {
  STUDY_PIP_COUNT,
  type StudyStatus,
} from '@/modules/grammar/presentation/resolveStudyStatus'

/**
 * One rule's position on the review ladder, drawn as the card's bottom edge.
 *
 * ```
 *   ┌──────────────────┐
 *   │ ● PRESENT PERFECT│
 *   ▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯   learning, stage 3 of 7
 * ```
 *
 * Three colours, one per kind of "done":
 *
 *   ink     you climbed the ladder     (mastered, or partway)
 *   red     a rung is due right now
 *   green   you said you already knew it
 *
 * A segmented bottom border rather than a strip inside the row. Sitting in the
 * row, it competed with the title for the same horizontal space and made every
 * leaf wider; as the bottom edge it costs no width at all, and a wall of leaves
 * can be scanned by how far each one's underline has filled in.
 *
 * Seven segments and not a percentage bar, because the ladder has seven
 * discrete rungs and the learner's next action is "answer this once more",
 * which a countable strip shows and a smooth bar hides.
 *
 * This is the same language as the creature health bar in the recall modal, on
 * purpose: a learner who has seen one should not have to learn the other.
 *
 * NO TEXT, deliberately. The map draws 184 of these, and the existing leaf code
 * already settled this trade for difficulty - "a badge on every leaf is 184
 * badges and the eye stops seeing them". The full wording still reaches screen
 * readers through the caller's `sr-only` label.
 *
 * Spans the full width it is given, so the caller has to hand it an edge rather
 * than a slot in a padded row.
 */
export function GrammarStudyPips({ status }: { status: StudyStatus }) {
  // Skipped: no ladder position exists, so a strip of empty segments would be a
  // lie that reads as "not started". A dashed edge instead.
  if (!status.showPips)
    return (
      <span
        aria-hidden="true"
        className="border-manga-ink-soft block w-full border-t-2 border-dashed"
      />
    )

  const filledClass = status.isDue
    ? // Due now: the strip itself is the call to action, so the filled part
      // carries the danger colour rather than adding another mark to the row.
      'border-comic-danger bg-comic-danger'
    : status.kind === 'alreadyKnow'
      ? 'border-comic-known bg-comic-known'
      : 'border-comic-ink bg-comic-ink'

  return (
    <span
      aria-hidden="true"
      className="flex w-full gap-px"
    >
      {Array.from({ length: STUDY_PIP_COUNT }, (_, index) => (
        <span
          className={`h-1.5 flex-1 border ${
            index < status.filledPips
              ? filledClass
              : 'border-manga-ink-soft bg-transparent'
          }`}
          key={index}
        />
      ))}
    </span>
  )
}

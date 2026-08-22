import type { GrammarContentFile, GrammarFamily } from '@/modules/grammar/types'

/**
 * Families where omitting the mark makes the answer WRONG, not just plainer.
 *
 * The test each family has to pass: would a careful writer call the version
 * without the mark an error? Not "is the mark conventional" - conventional is
 * not the same as required, and a grader that enforces convention rejects
 * correct English.
 *
 * - `relative-clauses`: the comma is the entire difference between a defining
 *   and a non-defining clause. "The man who left waved" and "The man, who left,
 *   waved" are both correct and mean different things - one man out of several
 *   versus one man, incidentally the one who left.
 * - `questions-negation`: a tag question is always written with the comma.
 *   "She likes tea doesn't she?" is not a form anyone writes.
 * - `reported-speech`: quotation marks around direct speech are structural, and
 *   the shift to indirect speech removes them along with the comma.
 *
 * `discourse-connectors` was here and was REMOVED after running this against
 * the real taxonomy: it accounted for 75 of 95 proposed flips, and every one was
 * a comma whose omission changes nothing. "I can stay but I need to leave early"
 * is correct English. Marking it wrong would have reproduced, in a new place,
 * exactly the false rejection this whole change exists to remove. Same reason
 * the "lesson mentions punctuation" branch is gone - a lesson noting that a
 * fronted adverbial usually takes a comma is not a lesson testing the comma.
 */
const PUNCTUATION_FAMILIES: GrammarFamily[] = [
  'questions-negation',
  'relative-clauses',
  'reported-speech',
]

/**
 * Punctuation INSIDE the sentence, not just closing it.
 *
 * Terminal marks are excluded because the grader trims them from both sides on
 * every drill regardless of this flag, so a target that merely ends in a full
 * stop tells us nothing.
 */
const INTERNAL_PUNCTUATION = /[,;:"“”]|(?<=\w)\s*[-–—]\s*(?=\w)/u

export interface PunctuationFlagProposal {
  drillId: string
  reason: string
  slug: string
  target: string
}

/**
 * Decide which existing drills should be graded punctuation-strictly.
 *
 * Every drill written before `punctuationSensitive` existed defaults to
 * tolerant, which is right for the great majority and WRONG for the handful
 * where the mark is the lesson: a relative-clause drill would start accepting
 * the comma-less answer, and the point would stop being able to teach its own
 * rule.
 *
 * So this is a one-time authoring pass, and the distinction from a runtime rule
 * matters. As a runtime inference, "guess from the family" would be silently
 * wrong on edge cases forever, which is why it was rejected. As an authoring
 * tool it produces a STORED flag that a human can read, override, and commit -
 * the derivation runs once and its output is reviewable.
 *
 * Both conditions must hold:
 *
 *   1. the point's family is one where omitting the mark is an ERROR rather
 *      than a style choice; AND
 *   2. the drill's target actually contains internal punctuation.
 *
 * Condition 2 is what keeps this from flagging every drill in three families.
 * A relative-clause drill whose target has no comma has no comma to enforce,
 * so flagging it would only make the grader stricter for no teaching gain.
 *
 * Never overwrites an existing value: a `punctuationSensitive` already set by
 * hand or by the generator is a decision, and a backfill must not relitigate it.
 */
export function proposePunctuationFlags(
  points: GrammarContentFile
): PunctuationFlagProposal[] {
  const proposals: PunctuationFlagProposal[] = []

  for (const point of points) {
    if (point.mergedInto) continue

    if (!PUNCTUATION_FAMILIES.includes(point.family as GrammarFamily)) continue

    for (const drill of point.drills ?? []) {
      // An explicit decision already exists. Leave it alone.
      if (drill.punctuationSensitive !== undefined) continue
      if (drill.generated) continue
      if (!INTERNAL_PUNCTUATION.test(drill.target ?? '')) continue

      proposals.push({
        drillId: drill.id,
        reason: `family ${point.family}`,
        slug: point.slug,
        target: drill.target,
      })
    }
  }

  return proposals
}

/**
 * Apply proposals to a content file, returning a new array.
 *
 * Separated from `proposePunctuationFlags` so the script can print every
 * proposed flip for review before anything is written, which is the whole point
 * of doing this as an authoring pass rather than at runtime.
 */
export function applyPunctuationFlags(
  points: GrammarContentFile,
  proposals: PunctuationFlagProposal[]
): GrammarContentFile {
  const bySlug = new Map<string, Set<string>>()

  for (const proposal of proposals) {
    const drillIds = bySlug.get(proposal.slug) ?? new Set<string>()

    drillIds.add(proposal.drillId)
    bySlug.set(proposal.slug, drillIds)
  }

  return points.map(point => {
    const drillIds = bySlug.get(point.slug)

    if (!drillIds || !point.drills) return point

    return {
      ...point,
      drills: point.drills.map(drill =>
        drillIds.has(drill.id)
          ? { ...drill, punctuationSensitive: true }
          : drill
      ),
    }
  })
}

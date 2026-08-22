import { findUncuedAnswerWords } from '@/modules/grammar/grading/answerability'
import { toLemma } from '@/modules/grammar/grading/lemma'
import type { GrammarContentFile } from '@/modules/grammar/types'

export interface FillBlankCueProposal {
  cue: string
  drillId: string
  nextPrompt: string
  prompt: string
  /** Why this one was skipped. Empty on a proposal that will be applied. */
  reason: string
  slug: string
  target: string
  /** Words whose lemma could not be resolved. Non-empty means skipped. */
  unresolved: string[]
}

/**
 * Would this cue simply be the answer?
 *
 * The cue is only a hint when the learner still has work to do with it.
 * "(play)" next to a blank answered by "played" asks for the past tense;
 * "(nevertheless)" next to a blank answered by "Nevertheless" asks for nothing
 * at all, and turns a connector-choice question into a copying exercise.
 *
 * Those drills are not unanswerable, they are a different kind of question -
 * the answer is inferable from the meaning of the surrounding sentences, which
 * is the skill being tested. They get reported rather than cued.
 */
function cueGivesAnswerAway(cue: string, target: string) {
  const words = (value: string) =>
    (value.toLowerCase().match(/[a-z']+/gu) ?? []).join(' ')

  return words(cue) === words(target)
}

export interface FillBlankCueReport {
  proposals: FillBlankCueProposal[]
  skipped: FillBlankCueProposal[]
}

/**
 * Put the cue immediately after the blank, the way a coursebook does.
 *
 *     I ___ football yesterday.   ->   I ___ (play) football yesterday.
 *
 * Position carries meaning: the cue belongs to the gap, and a learner reading
 * left to right meets the hint at the moment they need it. Appending to the end
 * of the sentence works but reads as an afterthought, and on a long sentence
 * the reader has to hold the blank in mind to use it.
 *
 * Falls back to appending when there is no blank marker, which happens on
 * prompts phrased as an instruction rather than a gap.
 */
function withCueAtBlank(prompt: string, cue: string) {
  const blank = /_{2,}|\.{3,}/u.exec(prompt)

  if (!blank) return `${prompt.trimEnd()} (${cue})`

  const end = blank.index + blank[0].length

  return `${prompt.slice(0, end)} (${cue})${prompt.slice(end)}`
}

/**
 * Give every unanswerable fill-blank the cue it is missing.
 *
 * ```
 *   before:  I ___ football yesterday.            target: played
 *            ^ equally "watched", "loved", "missed" - unanswerable
 *
 *   after:   I ___ (play) football yesterday.     target: played
 *            ^ one answer: the past tense of play
 * ```
 *
 * The transform is deterministic and needs no model: the missing word IS the
 * target, so the cue is the target's dictionary form. That is also the
 * conventional textbook format, which is why it reads as a normal exercise
 * rather than a workaround.
 *
 * Uncountable and already-base nouns come through unchanged - "advice" cues as
 * "(advice)" - and that is correct: the grammar under test is the quantifier in
 * "some advice", not the noun.
 *
 * Anything whose lemma cannot be resolved confidently is SKIPPED and reported,
 * because a wrong cue is worse than the missing one it replaces.
 */
export function proposeFillBlankCues(
  points: GrammarContentFile
): FillBlankCueReport {
  const proposals: FillBlankCueProposal[] = []
  const skipped: FillBlankCueProposal[] = []

  for (const point of points) {
    if (point.mergedInto) continue

    for (const drill of point.drills ?? []) {
      if (drill.kind !== 'fillBlank') continue
      if (drill.choices?.length) continue
      if (drill.generated) continue

      const uncued = findUncuedAnswerWords({
        prompt: drill.prompt,
        target: drill.target,
      })

      if (uncued.length === 0) continue

      const lemmas = uncued.map(word => ({ lemma: toLemma(word), word }))
      const unresolved = lemmas
        .filter(entry => !entry.lemma)
        .map(entry => entry.word)
      /**
       * Alphabetical, NOT the order they appear in the answer.
       *
       * Target order would hand over the answer on any drill about word order:
       * cueing "a beautiful small wooden table" as
       * "(beautiful / small / wooden / table)" tells an adjective-order drill's
       * learner exactly what to write. Sorting makes the cue a set of words to
       * use rather than a sequence to copy.
       */
      const cue = lemmas
        .map(entry => entry.lemma)
        .filter((lemma): lemma is string => Boolean(lemma))
        .sort((left, right) => left.localeCompare(right))
        .join(' / ')
      const reason =
        unresolved.length > 0
          ? `no confident dictionary form for: ${unresolved.join(', ')}`
          : !cue
            ? 'no cue could be built'
            : cueGivesAnswerAway(cue, drill.target)
              ? 'the cue would be the whole answer - this needs choices, or it is a meaning question rather than a form question'
              : ''
      const entry: FillBlankCueProposal = {
        cue,
        drillId: drill.id,
        nextPrompt: withCueAtBlank(drill.prompt, cue),
        prompt: drill.prompt,
        reason,
        slug: point.slug,
        target: drill.target,
        unresolved,
      }

      if (reason) skipped.push(entry)
      else proposals.push(entry)
    }
  }

  return { proposals, skipped }
}

/** Apply proposals, returning a new content array. */
export function applyFillBlankCues(
  points: GrammarContentFile,
  proposals: FillBlankCueProposal[]
): GrammarContentFile {
  const bySlug = new Map<string, Map<string, string>>()

  for (const proposal of proposals) {
    const drills = bySlug.get(proposal.slug) ?? new Map<string, string>()

    drills.set(proposal.drillId, proposal.nextPrompt)
    bySlug.set(proposal.slug, drills)
  }

  return points.map(point => {
    const drills = bySlug.get(point.slug)

    if (!drills || !point.drills) return point

    return {
      ...point,
      drills: point.drills.map(drill => {
        const nextPrompt = drills.get(drill.id)

        return nextPrompt ? { ...drill, prompt: nextPrompt } : drill
      }),
    }
  })
}

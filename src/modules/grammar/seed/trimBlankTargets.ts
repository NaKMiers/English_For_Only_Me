import {
  findBlankScopeConflict,
  overlapKey,
} from '@/modules/grammar/grading/answerability'
import type { GrammarContentFile } from '@/modules/grammar/types'

export interface BlankTargetProposal {
  drillId: string
  nextAcceptedAnswers: string[]
  nextTarget: string
  prompt: string
  /** Set when the target could not be trimmed safely. */
  reason: string
  slug: string
  target: string
}

export interface BlankTargetReport {
  proposals: BlankTargetProposal[]
  skipped: BlankTargetProposal[]
}

function words(value: string): string[] {
  return [...(value.match(/\S+/gu) ?? [])]
}

/** The words inside brackets, which are cues rather than sentence text. */
function cueWords(prompt: string): string[] {
  return [...prompt.matchAll(/\(([^)]*)\)/gu)].flatMap(match =>
    (match[1].toLowerCase().match(/[a-z']+/gu) ?? []).map(String)
  )
}

function bare(word: string) {
  return overlapKey(word.replace(/[^A-Za-z']/gu, ''))
}

/**
 * Drop the leading and trailing words the sentence already supplies.
 *
 *     prompt "The car ____ repaired."   target "has been repaired"
 *                                       ->     "has been"
 *
 *     prompt "a ___ of advice"          target "a piece of"
 *                                       ->     "piece"
 *
 * Iterative on both ends, because a target can overlap the sentence on both
 * sides at once, and one pass would leave the other side wrong.
 *
 * Returns null when trimming would consume the whole answer - that is not a
 * scope mistake, it is a drill whose prompt already contains its own answer,
 * and rewriting it needs a human.
 */
function trimToBlank(prompt: string, target: string): string | null {
  const stripped = prompt.replace(/\([^)]*\)/gu, ' ')
  const blank = /_{2,}|\.{3,}/u.exec(stripped)

  if (!blank) return null

  const before = words(stripped.slice(0, blank.index)).map(bare)
  const after = words(stripped.slice(blank.index + blank[0].length)).map(bare)
  let answer = words(target)

  for (let guard = 0; guard < 8; guard += 1) {
    if (answer.length === 0) return null

    const keys = answer.map(bare)
    let trimmed = false

    // Longest span first, so a two-word repeat is removed as a unit rather than
    // leaving half of it behind.
    for (let span = Math.min(3, answer.length); span >= 1; span -= 1) {
      if (
        before.length >= span &&
        before.slice(-span).join(' ') === keys.slice(0, span).join(' ')
      ) {
        answer = answer.slice(span)
        trimmed = true
        break
      }

      if (
        after.length >= span &&
        after.slice(0, span).join(' ') === keys.slice(-span).join(' ')
      ) {
        answer = answer.slice(0, -span)
        trimmed = true
        break
      }
    }

    if (!trimmed) break
  }

  const next = answer.join(' ')

  // Nothing left, or nothing changed: either way this is not a trim, it is a
  // prompt that needs rewriting.
  return !next || next === target ? null : next
}

/**
 * Make fill-blank targets match the size of their blank.
 *
 * A fill-blank target is the text that REPLACES the blank, nothing more. When
 * it also carries a word already printed beside the gap, the drill becomes
 * ungradeable: the learner writes the only sensible answer, the grader compares
 * it against a longer string, and marks a correct answer wrong.
 *
 * The trim is mechanical because the prompt says exactly which words are
 * already on the page. Accepted answers get the same treatment, since they are
 * alternative fillings of the same blank.
 */
export function proposeBlankTargetTrims(
  points: GrammarContentFile
): BlankTargetReport {
  const proposals: BlankTargetProposal[] = []
  const skipped: BlankTargetProposal[] = []

  for (const point of points) {
    if (point.mergedInto) continue

    for (const drill of point.drills ?? []) {
      if (drill.kind !== 'fillBlank') continue
      if (drill.choices?.length) continue
      if (drill.generated) continue

      const conflict = findBlankScopeConflict({
        prompt: drill.prompt,
        target: drill.target,
      })

      if (!conflict) continue

      const nextTarget = trimToBlank(drill.prompt, drill.target)
      /**
       * Would the trimmed answer be sitting in the prompt's own cue?
       *
       * "a ___ (piece) of advice" answered by "a piece of" trims to "piece" -
       * which the bracketed cue already spells out, so the question becomes
       * copying. The prompt and the target are fighting over the same words and
       * only a human should decide which one keeps them.
       */
      const cues = cueWords(drill.prompt)
      const collides = Boolean(
        nextTarget &&
        (nextTarget.toLowerCase().match(/[a-z']+/gu) ?? []).every(word =>
          cues.includes(word)
        ) &&
        cues.length > 0
      )
      const entry: BlankTargetProposal = {
        drillId: drill.id,
        nextAcceptedAnswers: (drill.acceptedAnswers ?? []).map(
          answer => trimToBlank(drill.prompt, answer) ?? answer
        ),
        nextTarget: nextTarget ?? drill.target,
        prompt: drill.prompt,
        reason: !nextTarget
          ? `"${conflict}" is repeated across the blank and trimming would leave nothing - the prompt needs rewriting`
          : collides
            ? `trimming leaves "${nextTarget}", which the prompt's own cue already gives away - this prompt needs rewriting`
            : '',
        slug: point.slug,
        target: drill.target,
      }

      if (entry.reason) skipped.push(entry)
      else proposals.push(entry)
    }
  }

  return { proposals, skipped }
}

export function applyBlankTargetTrims(
  points: GrammarContentFile,
  proposals: BlankTargetProposal[]
): GrammarContentFile {
  const bySlug = new Map<string, Map<string, BlankTargetProposal>>()

  for (const proposal of proposals) {
    const drills =
      bySlug.get(proposal.slug) ?? new Map<string, BlankTargetProposal>()

    drills.set(proposal.drillId, proposal)
    bySlug.set(proposal.slug, drills)
  }

  return points.map(point => {
    const drills = bySlug.get(point.slug)

    if (!drills || !point.drills) return point

    return {
      ...point,
      drills: point.drills.map(drill => {
        const proposal = drills.get(drill.id)

        if (!proposal) return drill

        return {
          ...drill,
          // The target must appear in its own accepted answers; that rule is
          // enforced by grammar:validate and is what stops a drill grading its
          // own answer wrong.
          acceptedAnswers: [
            ...new Set([proposal.nextTarget, ...proposal.nextAcceptedAnswers]),
          ],
          target: proposal.nextTarget,
        }
      }),
    }
  })
}
